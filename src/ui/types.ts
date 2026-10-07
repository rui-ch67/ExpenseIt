/**
 * Plain, serialisable shapes handed from server components to client
 * components. Domain objects (Money, entities) stay on the server; the UI
 * receives already-formatted strings plus the raw values it needs.
 */
import type { CategoryColor } from "@/domain/category";

export interface CategoryView {
  readonly id: string;
  readonly name: string;
  readonly color: CategoryColor;
}

export interface ExpenseView {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly category: CategoryView | null;
  readonly receiptId: string | null;
  readonly spentOn: string;
  /** What was paid, formatted in its own currency: "€18.50". */
  readonly amount: string;
  /** Decimal string for editing: "18.50". */
  readonly amountValue: string;
  readonly currency: string;
  /** Home-currency amount, formatted: "£16.13". */
  readonly homeAmount: string;
  readonly homeMinor: number;
  readonly isForeign: boolean;
}

export interface Segment {
  readonly color: CategoryColor | null;
  readonly share: number;
  readonly label: string;
}

export interface ReceiptItemView {
  readonly id: string;
  readonly description: string;
  readonly quantity: string;
  /** Decimal string in the receipt's currency. */
  readonly total: string;
}

export interface ReceiptView {
  readonly id: string;
  readonly status: "processing" | "ready" | "failed";
  readonly merchant: string;
  readonly purchasedOn: string | null;
  readonly currency: string;
  readonly total: string | null;
  readonly items: readonly ReceiptItemView[];
  readonly hasPhoto: boolean;
}
