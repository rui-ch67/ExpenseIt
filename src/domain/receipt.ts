import type { CurrencyCode } from "./currency";
import type { IsoDate } from "./dates";
import type { Money } from "./money";

/**
 * - `processing`: image uploaded, extraction not finished yet.
 * - `ready`: extracted; the user can review and turn it into expenses.
 * - `failed`: extraction failed; the user can retry or fill it in by hand.
 */
export type ReceiptStatus = "processing" | "ready" | "failed";

export interface ReceiptItem {
  readonly id: string;
  readonly position: number;
  readonly description: string;
  /** Decimal string, so weighed items like "0.452" (kg) survive intact. */
  readonly quantity: string;
  readonly total: Money;
}

export interface Receipt {
  readonly id: string;
  readonly userId: string;
  readonly status: ReceiptStatus;
  readonly merchant: string;
  readonly purchasedOn: IsoDate | null;
  readonly currency: CurrencyCode;
  readonly total: Money | null;
  /** Storage path of the receipt photo, or null if none was kept. */
  readonly imagePath: string | null;
  readonly items: readonly ReceiptItem[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** What an OCR provider hands back, before the user has reviewed it. */
export interface ExtractedReceipt {
  readonly merchant: string | null;
  readonly purchasedOn: IsoDate | null;
  readonly currency: CurrencyCode | null;
  readonly total: Money | null;
  readonly items: ReadonlyArray<{
    readonly description: string;
    readonly quantity: string;
    readonly total: Money;
  }>;
}
