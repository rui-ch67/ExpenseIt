import type { Category } from "@/domain/category";
import type { Expense } from "@/domain/expense";

const HEADER = [
  "date",
  "title",
  "category",
  "amount",
  "currency",
  "home_amount",
  "home_currency",
  "exchange_rate",
  "note",
  "from_receipt",
  "recurring",
];

/**
 * One CSV field. Quotes when needed (RFC 4180), and defuses cells that a
 * spreadsheet would run as a formula (a title starting with "=" or "+").
 */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvHeader(): string {
  return `${HEADER.join(",")}\r\n`;
}

export function expenseToCsvRow(expense: Expense, categories: ReadonlyMap<string, Category>): string {
  const category = expense.categoryId ? (categories.get(expense.categoryId)?.name ?? "") : "";
  return `${[
    expense.spentOn,
    expense.title,
    category,
    expense.amount.toDecimalString(),
    expense.amount.currency,
    expense.homeAmount.toDecimalString(),
    expense.homeAmount.currency,
    expense.fxRate,
    expense.note,
    expense.receiptId ? "yes" : "no",
    expense.recurringRuleId ? "yes" : "no",
  ]
    .map(csvField)
    .join(",")}\r\n`;
}
