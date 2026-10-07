import { parseCurrencyCode } from "@/domain/currency";
import { parseIsoDate } from "@/domain/dates";
import {
  ConflictError,
  DomainError,
  LimitReachedError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors";
import type { Expense } from "@/domain/expense";
import { Money } from "@/domain/money";
import type { Receipt } from "@/domain/receipt";
import { splitReceipt } from "@/domain/receipt-split";
import type { ExpenseService } from "../expenses/expense-service";
import type {
  CategoryRepository,
  Clock,
  ImageStore,
  NewReceiptItem,
  Page,
  ReceiptExtractor,
  ReceiptImage,
  ReceiptRepository,
  UsageLimiter,
} from "../ports";
import type { SettingsService } from "../settings/settings-service";
import { extensionFor } from "./receipt-image";

export interface ScanLimits {
  /** Scans per day for a signed-up account. */
  readonly perUser: number;
  /** Scans per day for a demo account. */
  readonly perDemoUser: number;
  /** Scans per day across everyone, to stay inside the free OCR quota. */
  readonly global: number;
}

export const DEFAULT_SCAN_LIMITS: ScanLimits = { perUser: 25, perDemoUser: 5, global: 300 };

/** What the review screen submits after the user has checked the scan. */
export interface ReceiptInput {
  readonly merchant: string;
  readonly purchasedOn: string;
  readonly currency: string;
  readonly total: string;
  readonly items: ReadonlyArray<{ description: string; quantity?: string; total: string }>;
}

export interface SaveAsExpensesInput {
  /** Category for every item not listed in `itemCategories`. */
  readonly categoryId: string | null;
  /** Item id → category, for items moved elsewhere (split receipts). */
  readonly itemCategories?: Readonly<Record<string, string | null>>;
  readonly note?: string;
}

export interface ScanResult {
  readonly receipt: Receipt;
  /** Set when the photo was saved but couldn't be read automatically. */
  readonly problem: string | null;
}

/**
 * The receipt pipeline: photo → private storage → OCR → review → expenses.
 */
export class ReceiptService {
  constructor(
    private readonly receipts: ReceiptRepository,
    private readonly expenses: ExpenseService,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly extractor: ReceiptExtractor,
    private readonly images: ImageStore,
    private readonly limiter: UsageLimiter,
    private readonly clock: Clock,
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly limits: ScanLimits = DEFAULT_SCAN_LIMITS,
  ) {}

  /**
   * Stores the photo, then reads it. If reading fails for a temporary reason
   * the receipt is kept as `failed` with its photo, so the user can retry or
   * type it in. A photo that isn't a receipt is discarded.
   */
  async scan(user: { id: string; isDemo: boolean }, image: ReceiptImage): Promise<ScanResult> {
    await this.consumeScan(user);

    const path = `receipts/${user.id}/${this.newId()}.${extensionFor(image.contentType)}`;
    await this.images.put(path, image);
    const receipt = await this.receipts.create({
      userId: user.id,
      status: "processing",
      merchant: "",
      purchasedOn: null,
      currency: await this.settings.homeCurrency(user.id),
      total: null,
      imagePath: path,
      items: [],
    });
    return this.read(user.id, receipt, image);
  }

  /** Reads a stored photo again (the "Rescan" action v1 never finished). */
  async rescan(user: { id: string; isDemo: boolean }, receiptId: string): Promise<ScanResult> {
    const receipt = await this.get(user.id, receiptId);
    if (!receipt.imagePath) throw new ValidationError("This receipt has no photo to scan");
    const stored = await this.images.get(receipt.imagePath);
    if (!stored) throw new NotFoundError("Receipt photo");

    await this.consumeScan(user);
    const bytes = new Uint8Array(await new Response(stored.body).arrayBuffer());
    return this.read(user.id, receipt, {
      bytes,
      contentType: stored.contentType as ReceiptImage["contentType"],
    });
  }

  async get(userId: string, id: string): Promise<Receipt> {
    const receipt = await this.receipts.findById(userId, id);
    if (!receipt) throw new NotFoundError("Receipt");
    return receipt;
  }

  list(userId: string, limit = 30, cursor?: string): Promise<Page<Receipt>> {
    return this.receipts.list(userId, Math.min(Math.max(limit, 1), 100), cursor);
  }

  /** Saves the user's corrections from the review screen. */
  async update(userId: string, id: string, input: ReceiptInput): Promise<Receipt> {
    const currency = parseCurrencyCode(input.currency);
    const total = Money.parse(input.total, currency);
    if (total.isZero() || total.isNegative()) {
      throw new ValidationError("The receipt total must be more than zero");
    }
    const items: NewReceiptItem[] = input.items.map((item) => {
      const description = item.description.trim();
      if (!description) throw new ValidationError("Every item needs a description");
      const quantity = item.quantity?.trim() || "1";
      if (!/^\d+(\.\d{1,3})?$/.test(quantity)) {
        throw new ValidationError(`"${quantity}" isn't a valid quantity`);
      }
      return { description: description.slice(0, 200), quantity, total: Money.parse(item.total, currency) };
    });

    const updated = await this.receipts.update(userId, id, {
      status: "ready",
      merchant: input.merchant.trim().slice(0, 120),
      purchasedOn: parseIsoDate(input.purchasedOn),
      currency,
      total,
      items,
    });
    if (!updated) throw new NotFoundError("Receipt");
    return updated;
  }

  /** Deletes the receipt and its photo. Expenses made from it are kept. */
  async delete(userId: string, id: string): Promise<void> {
    const deleted = await this.receipts.delete(userId, id);
    if (!deleted) throw new NotFoundError("Receipt");
    if (deleted.imagePath) await this.images.delete([deleted.imagePath]);
  }

  async photo(userId: string, id: string) {
    const receipt = await this.get(userId, id);
    return receipt.imagePath ? this.images.get(receipt.imagePath) : null;
  }

  /**
   * Turns a reviewed receipt into expenses: one, or one per category when
   * items have been moved to other categories.
   */
  async saveAsExpenses(userId: string, id: string, input: SaveAsExpensesInput): Promise<Expense[]> {
    const receipt = await this.get(userId, id);
    if (receipt.status !== "ready" || !receipt.total || !receipt.purchasedOn) {
      throw new ValidationError("Check the receipt's date and total before saving it");
    }
    const existing = await this.expenses.listForReceipt(userId, id);
    if (existing.length > 0) {
      throw new ConflictError(
        existing.length === 1
          ? "This receipt is already saved as an expense"
          : `This receipt is already saved as ${existing.length} expenses`,
      );
    }

    const assignments = new Map(Object.entries(input.itemCategories ?? {}));
    const parts = splitReceipt(receipt.total, receipt.items, assignments, input.categoryId);
    const names = new Map((await this.categories.list(userId)).map((c) => [c.id, c.name]));
    const title = receipt.merchant || "Receipt";

    return this.expenses.logMany(
      userId,
      parts.map((part) => ({
        title: parts.length > 1 ? `${title} · ${names.get(part.categoryId ?? "") ?? "Other"}` : title,
        amount: part.amount.toDecimalString(),
        currency: receipt.currency,
        spentOn: receipt.purchasedOn!,
        categoryId: part.categoryId,
        receiptId: receipt.id,
        note: input.note ?? describeItems(receipt, part.itemIds),
      })),
    );
  }

  private async read(userId: string, receipt: Receipt, image: ReceiptImage): Promise<ScanResult> {
    const fallbackCurrency = await this.settings.homeCurrency(userId);
    try {
      const { receipt: extracted, model, raw } = await this.extractor.extract(image, {
        fallbackCurrency,
      });
      const currency = extracted.currency ?? fallbackCurrency;
      const updated = await this.receipts.update(userId, receipt.id, {
        status: "ready",
        merchant: extracted.merchant ?? "",
        purchasedOn: extracted.purchasedOn ?? this.clock.today(),
        currency,
        total: extracted.total,
        items: extracted.items,
        extraction: { model, raw },
      });
      return { receipt: updated!, problem: null };
    } catch (error) {
      if (error instanceof ValidationError) {
        // Not a receipt: don't keep the photo around.
        await this.delete(userId, receipt.id);
        throw error;
      }
      const problem =
        error instanceof DomainError
          ? error.message
          : "Something went wrong reading this receipt. You can retry or fill it in yourself.";
      if (!(error instanceof DomainError)) console.error("Receipt extraction failed", error);
      const failed = await this.receipts.update(userId, receipt.id, { status: "failed" });
      return { receipt: failed!, problem };
    }
  }

  private async consumeScan(user: { id: string; isDemo: boolean }): Promise<void> {
    const day = this.clock.today();
    const userKey = `scan:user:${user.id}`;
    const userLimit = user.isDemo ? this.limits.perDemoUser : this.limits.perUser;
    if (!(await this.limiter.tryConsume(userKey, day, userLimit))) {
      throw new LimitReachedError(
        `You've used today's ${userLimit} receipt scans. You can still add expenses by hand, and scanning resets tomorrow.`,
      );
    }
    if (!(await this.limiter.tryConsume("scan:global", day, this.limits.global))) {
      await this.limiter.release(userKey, day);
      throw new LimitReachedError(
        "Receipt scanning has reached its daily limit. Add the expense by hand for now, or try again tomorrow.",
      );
    }
  }
}

function describeItems(receipt: Receipt, itemIds: readonly string[]): string {
  const ids = new Set(itemIds);
  const names = receipt.items.filter((i) => ids.has(i.id)).map((i) => i.description);
  const text = names.join(", ");
  return text.length > 500 ? `${text.slice(0, 497)}…` : text;
}
