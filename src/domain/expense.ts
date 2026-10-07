import type { IsoDate } from "./dates";
import { ValidationError } from "./errors";
import type { Money } from "./money";

/**
 * One purchase. `amount` is what was actually paid, in the currency it was
 * paid in. `homeAmount` is the same purchase converted to the user's home
 * currency at that day's rate, which is what totals and budgets add up.
 * Keeping both means a €12 coffee in Lisbon still reads "€12.00" in the
 * list while counting as £10.40 towards the month.
 */
export interface Expense {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly note: string;
  /** `null` means uncategorised: deleting a category never deletes spending. */
  readonly categoryId: string | null;
  readonly receiptId: string | null;
  /** Set when the expense was logged automatically by a recurring payment. */
  readonly recurringRuleId: string | null;
  readonly spentOn: IsoDate;
  readonly amount: Money;
  readonly homeAmount: Money;
  /** Rate used for the conversion ("1" when no conversion was needed). */
  readonly fxRate: string;
  readonly fxRateDate: IsoDate;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const EXPENSE_TITLE_MAX_LENGTH = 120;
export const EXPENSE_NOTE_MAX_LENGTH = 1000;

export function normaliseTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    throw new ValidationError("Give the expense a title");
  }
  if (trimmed.length > EXPENSE_TITLE_MAX_LENGTH) {
    throw new ValidationError(
      `Title must be ${EXPENSE_TITLE_MAX_LENGTH} characters or fewer`,
    );
  }
  return trimmed;
}

export function normaliseNote(note: string | undefined): string {
  const trimmed = (note ?? "").trim();
  if (trimmed.length > EXPENSE_NOTE_MAX_LENGTH) {
    throw new ValidationError(`Note must be ${EXPENSE_NOTE_MAX_LENGTH} characters or fewer`);
  }
  return trimmed;
}

export function assertSpendableAmount(amount: Money): void {
  if (amount.isZero() || amount.isNegative()) {
    throw new ValidationError("Amount must be more than zero");
  }
}
