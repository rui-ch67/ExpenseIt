/**
 * Ports: the interfaces the application layer depends on.
 *
 * Services only ever see these interfaces, never Drizzle, Neon or Gemini
 * directly (the Dependency Inversion Principle). The concrete adapters live
 * in `src/infrastructure` and are wired together in `src/server/container.ts`,
 * which plays the role Hilt's AppModule played in the Android app.
 *
 * Every repository method takes `userId`, so a query can't accidentally
 * reach another user's data: ownership is part of the signature.
 */
import type { Budget } from "@/domain/budget";
import type { Category, CategoryColor } from "@/domain/category";
import type { CurrencyCode } from "@/domain/currency";
import type { IsoDate, YearMonth } from "@/domain/dates";
import type { ExchangeRate } from "@/domain/exchange-rate";
import type { Expense } from "@/domain/expense";
import type { Money } from "@/domain/money";
import type { ExtractedReceipt, Receipt, ReceiptStatus } from "@/domain/receipt";
import type { Frequency, RecurringRule } from "@/domain/recurrence";

// ── Categories ────────────────────────────────────────────────────────────

export interface NewCategory {
  readonly name: string;
  readonly color: CategoryColor;
  readonly sortOrder: number;
}

export interface CategoryRepository {
  list(userId: string): Promise<Category[]>;
  findById(userId: string, id: string): Promise<Category | null>;
  /** Case-insensitive lookup, used to keep names unique per user. */
  findByName(userId: string, name: string): Promise<Category | null>;
  create(userId: string, category: NewCategory): Promise<Category>;
  createMany(userId: string, categories: readonly NewCategory[]): Promise<void>;
  update(
    userId: string,
    id: string,
    patch: Partial<Pick<Category, "name" | "color">>,
  ): Promise<Category | null>;
  /** Expenses in the category become uncategorised; they are never deleted. */
  delete(userId: string, id: string): Promise<boolean>;
  /** Persists `orderedIds` as the new display order, atomically. */
  reorder(userId: string, orderedIds: readonly string[]): Promise<void>;
}

// ── Expenses ──────────────────────────────────────────────────────────────

export interface NewExpense {
  readonly userId: string;
  readonly title: string;
  readonly note: string;
  readonly categoryId: string | null;
  readonly receiptId: string | null;
  readonly recurringRuleId?: string | null;
  readonly spentOn: IsoDate;
  readonly amount: Money;
  readonly homeAmount: Money;
  readonly fxRate: string;
  readonly fxRateDate: IsoDate;
}

export type ExpensePatch = Partial<Omit<NewExpense, "userId">>;

/** `"none"` in `categoryIds` matches uncategorised expenses. */
export interface ExpenseQuery {
  readonly search?: string;
  readonly categoryIds?: ReadonlyArray<string | "none">;
  readonly from?: IsoDate;
  readonly to?: IsoDate;
  /** Bounds on the home-currency amount, in minor units. */
  readonly minHomeMinor?: number;
  readonly maxHomeMinor?: number;
  readonly limit: number;
  /** Opaque cursor from a previous page's `nextCursor`. */
  readonly cursor?: string;
}

export interface Page<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
}

export interface MonthTotal {
  readonly month: YearMonth;
  readonly homeMinor: number;
}

export interface CategoryTotal {
  readonly categoryId: string | null;
  readonly homeMinor: number;
  readonly count: number;
}

export interface DayTotal {
  readonly day: IsoDate;
  readonly homeMinor: number;
}

export interface MerchantTotal {
  readonly title: string;
  readonly count: number;
  readonly homeMinor: number;
}

export interface CurrencyTotal {
  readonly currency: CurrencyCode;
  readonly count: number;
  /** Sum in the currency itself, in its minor units. */
  readonly amountMinor: number;
  readonly homeMinor: number;
}

export interface HomeAmountUpdate {
  readonly id: string;
  readonly homeAmount: Money;
  readonly fxRate: string;
  readonly fxRateDate: IsoDate;
}

export interface ExpenseRepository {
  create(expense: NewExpense): Promise<Expense>;
  /**
   * Inserts in one statement per batch. With `skipDuplicates`, an expense a
   * recurring payment already logged for that date is skipped, not an error.
   */
  createMany(expenses: readonly NewExpense[], options?: { skipDuplicates?: boolean }): Promise<Expense[]>;
  findById(userId: string, id: string): Promise<Expense | null>;
  listByReceipt(userId: string, receiptId: string): Promise<Expense[]>;
  /** Which of these receipts have already been saved as expenses. */
  receiptsWithExpenses(userId: string, receiptIds: readonly string[]): Promise<Set<string>>;
  update(userId: string, id: string, patch: ExpensePatch): Promise<Expense | null>;
  delete(userId: string, id: string): Promise<boolean>;
  /** Newest first (by date spent, then by when it was logged). */
  list(userId: string, query: ExpenseQuery): Promise<Page<Expense>>;

  // Aggregates are summed in `homeCurrency` only, so a half-finished
  // currency change can never mix two currencies into one total.
  totalsByMonth(
    userId: string,
    homeCurrency: CurrencyCode,
    from: YearMonth,
    to: YearMonth,
  ): Promise<MonthTotal[]>;
  totalsByCategory(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
  ): Promise<CategoryTotal[]>;
  totalsByDay(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
  ): Promise<DayTotal[]>;

  /** Where money went by place, most visited first. */
  totalsByMerchant(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
    options?: { categoryId?: string | null; limit?: number },
  ): Promise<MerchantTotal[]>;
  totalsByCurrency(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
  ): Promise<CurrencyTotal[]>;

  /** Home-currency total of expenses logged by recurring payments in a range. */
  recurringTotal(userId: string, homeCurrency: CurrencyCode, from: IsoDate, to: IsoDate): Promise<number>;

  /** Expenses whose home amount isn't in `homeCurrency` yet. */
  listNotInHomeCurrency(userId: string, homeCurrency: CurrencyCode): Promise<Expense[]>;
  updateHomeAmounts(userId: string, updates: readonly HomeAmountUpdate[]): Promise<void>;
}

// ── Budgets ───────────────────────────────────────────────────────────────

export interface BudgetRepository {
  list(userId: string): Promise<Budget[]>;
  /** Creates or replaces the budget for a category (or overall, with null). */
  upsert(userId: string, categoryId: string | null, amount: Money): Promise<Budget>;
  delete(userId: string, id: string): Promise<boolean>;
  updateAmounts(userId: string, updates: ReadonlyArray<{ id: string; amount: Money }>): Promise<void>;
}

// ── Recurring payments ────────────────────────────────────────────────────

export interface NewRecurringRule {
  readonly userId: string;
  readonly title: string;
  readonly note: string;
  readonly categoryId: string | null;
  readonly amount: Money;
  readonly frequency: Frequency;
  readonly startsOn: IsoDate;
  readonly nextDueOn: IsoDate | null;
  readonly endsOn: IsoDate | null;
  readonly paused: boolean;
}

export interface RecurringRuleRepository {
  list(userId: string): Promise<RecurringRule[]>;
  findById(userId: string, id: string): Promise<RecurringRule | null>;
  create(rule: NewRecurringRule): Promise<RecurringRule>;
  update(userId: string, id: string, patch: Partial<Omit<NewRecurringRule, "userId">>): Promise<RecurringRule | null>;
  delete(userId: string, id: string): Promise<boolean>;
  /** Active rules with a payment due on or before `today`. */
  listDue(today: IsoDate, userId?: string): Promise<RecurringRule[]>;
}

// ── Receipts ──────────────────────────────────────────────────────────────

export interface NewReceiptItem {
  readonly description: string;
  readonly quantity: string;
  readonly total: Money;
}

export interface NewReceipt {
  readonly userId: string;
  readonly status: ReceiptStatus;
  readonly merchant: string;
  readonly purchasedOn: IsoDate | null;
  readonly currency: CurrencyCode;
  readonly total: Money | null;
  readonly imagePath: string | null;
  readonly suggestedCategoryId?: string | null;
  readonly items: readonly NewReceiptItem[];
  /** Raw provider output, kept for debugging and re-parsing. */
  readonly extraction?: unknown;
}

export type ReceiptPatch = Partial<Omit<NewReceipt, "userId">>;

export interface ReceiptRepository {
  /** Saves the receipt and its items in one transaction. */
  create(receipt: NewReceipt): Promise<Receipt>;
  findById(userId: string, id: string): Promise<Receipt | null>;
  list(userId: string, limit: number, cursor?: string): Promise<Page<Receipt>>;
  /** Passing `items` replaces the whole item list. */
  update(userId: string, id: string, patch: ReceiptPatch): Promise<Receipt | null>;
  /** Returns what was deleted, so the caller can remove the stored image. */
  delete(userId: string, id: string): Promise<Receipt | null>;
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface UserSettings {
  readonly userId: string;
  readonly homeCurrency: CurrencyCode;
}

export interface SettingsRepository {
  get(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<void>;
}

// ── External services ─────────────────────────────────────────────────────

export const RECEIPT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ReceiptImageType = (typeof RECEIPT_IMAGE_TYPES)[number];

export interface ReceiptImage {
  readonly bytes: Uint8Array;
  readonly contentType: ReceiptImageType;
}

export interface ReceiptExtraction {
  readonly receipt: ExtractedReceipt;
  /** Which model produced it, for debugging accuracy. */
  readonly model: string;
  /** The provider's raw answer, stored alongside the receipt. */
  readonly raw: unknown;
}

/** Reads a receipt photo (OCR + understanding). Gemini today; swappable. */
export interface ReceiptExtractor {
  extract(
    image: ReceiptImage,
    hints: { fallbackCurrency: CurrencyCode; categories: readonly string[] },
  ): Promise<ReceiptExtraction>;
}

/** Private storage for receipt photos. Paths are only ever served after an ownership check. */
export interface ImageStore {
  put(path: string, image: ReceiptImage): Promise<void>;
  get(path: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null>;
  delete(paths: readonly string[]): Promise<void>;
}

/**
 * Daily usage limits, so the free OCR quota can't be drained by one person
 * (or by the shared demo). `tryConsume` counts one use and returns false,
 * without counting, once `limit` is reached.
 */
export interface UsageLimiter {
  tryConsume(key: string, day: IsoDate, limit: number): Promise<boolean>;
  used(key: string, day: IsoDate): Promise<number>;
  release(key: string, day: IsoDate): Promise<void>;
}

export interface ExchangeRateProvider {
  /** The published rate for `on`, or the latest one before it. */
  getRate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate>;
}

/** Remembers rates already fetched, so each one is only requested once. */
export interface ExchangeRateStore {
  find(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate | null>;
  save(requestedOn: IsoDate, rate: ExchangeRate): Promise<void>;
}

export interface Clock {
  today(): IsoDate;
}
