import "server-only";
import type { Category } from "@/domain/category";
import type { Expense } from "@/domain/expense";
import type { Receipt } from "@/domain/receipt";
import type { CategoryView, ExpenseView, ReceiptView } from "@/ui/types";

/** Domain → plain props for the UI. Formatting happens here, on the server. */
export function toCategoryView(category: Category): CategoryView {
  return { id: category.id, name: category.name, color: category.color };
}

export function toExpenseView(
  expense: Expense,
  categories: ReadonlyMap<string, Category>,
): ExpenseView {
  const category = expense.categoryId ? categories.get(expense.categoryId) : undefined;
  return {
    id: expense.id,
    title: expense.title,
    note: expense.note,
    category: category ? toCategoryView(category) : null,
    receiptId: expense.receiptId,
    spentOn: expense.spentOn,
    amount: expense.amount.format(),
    amountValue: expense.amount.toDecimalString(),
    currency: expense.amount.currency,
    homeAmount: expense.homeAmount.format(),
    homeMinor: expense.homeAmount.minor,
    isForeign: expense.amount.currency !== expense.homeAmount.currency,
  };
}

export function categoryMap(categories: readonly Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function toReceiptView(receipt: Receipt): ReceiptView {
  return {
    id: receipt.id,
    status: receipt.status,
    merchant: receipt.merchant,
    purchasedOn: receipt.purchasedOn,
    currency: receipt.currency,
    total: receipt.total?.toDecimalString() ?? null,
    items: receipt.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      total: item.total.toDecimalString(),
    })),
    hasPhoto: receipt.imagePath !== null,
  };
}
