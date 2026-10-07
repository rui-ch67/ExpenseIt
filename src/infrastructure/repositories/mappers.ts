/**
 * Converts database rows into domain objects. Kept in one place so the
 * repositories stay focused on queries.
 */
import type { Category } from "@/domain/category";
import { parseCategoryColor } from "@/domain/category";
import { parseCurrencyCode } from "@/domain/currency";
import { parseIsoDate } from "@/domain/dates";
import type { Expense } from "@/domain/expense";
import { Money } from "@/domain/money";
import type { Receipt, ReceiptItem } from "@/domain/receipt";
import type { categories, expenses, receiptItems, receipts } from "../db/schema";

export function toCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: parseCategoryColor(row.color),
    sortOrder: row.sortOrder,
  };
}

export function toExpense(row: typeof expenses.$inferSelect): Expense {
  const currency = parseCurrencyCode(row.currency);
  const homeCurrency = parseCurrencyCode(row.homeCurrency);
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    note: row.note,
    categoryId: row.categoryId,
    receiptId: row.receiptId,
    spentOn: parseIsoDate(row.spentOn),
    amount: Money.ofMinor(row.amountMinor, currency),
    homeAmount: Money.ofMinor(row.homeAmountMinor, homeCurrency),
    fxRate: trimDecimal(row.fxRate),
    fxRateDate: parseIsoDate(row.fxRateDate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReceipt(
  row: typeof receipts.$inferSelect,
  items: ReadonlyArray<typeof receiptItems.$inferSelect>,
): Receipt {
  const currency = parseCurrencyCode(row.currency);
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    merchant: row.merchant,
    purchasedOn: row.purchasedOn ? parseIsoDate(row.purchasedOn) : null,
    currency,
    total: row.totalMinor === null ? null : Money.ofMinor(row.totalMinor, currency),
    imagePath: row.imagePath,
    items: [...items]
      .sort((a, b) => a.position - b.position)
      .map(
        (item): ReceiptItem => ({
          id: item.id,
          position: item.position,
          description: item.description,
          quantity: trimDecimal(item.quantity),
          total: Money.ofMinor(item.totalMinor, currency),
        }),
      ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Postgres pads numerics to their scale: "1.000" → "1", "0.1854600000" → "0.18546". */
export function trimDecimal(value: string): string {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}
