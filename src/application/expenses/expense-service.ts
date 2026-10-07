import { parseCurrencyCode } from "@/domain/currency";
import { parseIsoDate } from "@/domain/dates";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  assertSpendableAmount,
  type Expense,
  normaliseNote,
  normaliseTitle,
} from "@/domain/expense";
import { Money } from "@/domain/money";
import type { CurrencyConverter } from "../currency/currency-converter";
import type {
  CategoryRepository,
  ExpenseQuery,
  ExpenseRepository,
  NewExpense,
  Page,
  ReceiptRepository,
} from "../ports";
import type { SettingsService } from "../settings/settings-service";

/** What a form submits. Strings are parsed and validated here, not in the UI. */
export interface ExpenseInput {
  readonly title: string;
  /** Decimal string as typed, e.g. "12.50". */
  readonly amount: string;
  readonly currency: string;
  readonly spentOn: string;
  readonly categoryId?: string | null;
  readonly note?: string;
  readonly receiptId?: string | null;
}

export const MAX_PAGE_SIZE = 100;

export class ExpenseService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly receipts: ReceiptRepository,
    private readonly settings: SettingsService,
    private readonly converter: CurrencyConverter,
  ) {}

  async get(userId: string, id: string): Promise<Expense> {
    const expense = await this.expenses.findById(userId, id);
    if (!expense) throw new NotFoundError("Expense");
    return expense;
  }

  async list(userId: string, query: ExpenseQuery): Promise<Page<Expense>> {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > MAX_PAGE_SIZE) {
      throw new ValidationError(`Page size must be between 1 and ${MAX_PAGE_SIZE}`);
    }
    if (query.from && query.to && query.from > query.to) {
      throw new ValidationError("The start date must be before the end date");
    }
    return this.expenses.list(userId, { ...query, search: query.search?.trim() || undefined });
  }

  async log(userId: string, input: ExpenseInput): Promise<Expense> {
    return this.expenses.create({ userId, ...(await this.prepare(userId, input)) });
  }

  /**
   * Logs several expenses in one insert: either all are saved or none are.
   * Every input is validated and converted before anything is written.
   */
  async logMany(userId: string, inputs: readonly ExpenseInput[]): Promise<Expense[]> {
    const prepared: NewExpense[] = [];
    for (const input of inputs) {
      prepared.push({ userId, ...(await this.prepare(userId, input)) });
    }
    return this.expenses.createMany(prepared);
  }

  listForReceipt(userId: string, receiptId: string): Promise<Expense[]> {
    return this.expenses.listByReceipt(userId, receiptId);
  }

  async update(userId: string, id: string, input: ExpenseInput): Promise<Expense> {
    const existing = await this.get(userId, id);
    // Keep the receipt link unless the caller explicitly changes it.
    // (In v1, editing an expense silently dropped its receipt.)
    const withReceipt = { ...input, receiptId: input.receiptId ?? existing.receiptId };
    const patch = await this.prepare(userId, withReceipt, existing);
    const updated = await this.expenses.update(userId, id, patch);
    if (!updated) throw new NotFoundError("Expense");
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await this.expenses.delete(userId, id);
    if (!deleted) throw new NotFoundError("Expense");
  }

  /** Validates input, checks ownership of linked records, converts currency. */
  private async prepare(
    userId: string,
    input: ExpenseInput,
    existing?: Expense,
  ): Promise<Omit<NewExpense, "userId">> {
    const currency = parseCurrencyCode(input.currency);
    const amount = Money.parse(input.amount, currency);
    assertSpendableAmount(amount);
    const spentOn = parseIsoDate(input.spentOn);

    const categoryId = input.categoryId || null;
    if (categoryId && !(await this.categories.findById(userId, categoryId))) {
      throw new ValidationError("That category doesn't exist");
    }
    const receiptId = input.receiptId || null;
    if (receiptId && !(await this.receipts.findById(userId, receiptId))) {
      throw new ValidationError("That receipt doesn't exist");
    }

    const { homeAmount, fxRate, fxRateDate } = await this.convertToHome(
      userId,
      amount,
      spentOn,
      existing,
    );

    return {
      title: normaliseTitle(input.title),
      note: normaliseNote(input.note),
      categoryId,
      receiptId,
      spentOn,
      amount,
      homeAmount,
      fxRate,
      fxRateDate,
    };
  }

  /** Reuses the existing conversion when nothing that affects it changed. */
  private async convertToHome(
    userId: string,
    amount: Money,
    spentOn: Expense["spentOn"],
    existing?: Expense,
  ): Promise<Pick<Expense, "homeAmount" | "fxRate" | "fxRateDate">> {
    const homeCurrency = await this.settings.homeCurrency(userId);
    if (
      existing &&
      existing.amount.equals(amount) &&
      existing.spentOn === spentOn &&
      existing.homeAmount.currency === homeCurrency
    ) {
      return existing;
    }
    const { converted, rate } = await this.converter.convert(amount, homeCurrency, spentOn);
    return { homeAmount: converted, fxRate: rate.rate, fxRateDate: rate.publishedOn };
  }
}
