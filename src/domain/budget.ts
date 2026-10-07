import { ValidationError } from "./errors";
import type { Money } from "./money";

/**
 * A monthly spending limit, for one category or (with `categoryId` null)
 * for everything. Amounts are in the user's home currency.
 */
export interface Budget {
  readonly id: string;
  readonly userId: string;
  readonly categoryId: string | null;
  readonly amount: Money;
}

export type BudgetState = "under" | "near" | "over";

/** From this share of the budget onwards, it's flagged as getting close. */
export const NEAR_LIMIT = 0.8;

export interface BudgetStatus {
  readonly budget: Budget;
  readonly spent: Money;
  /** Negative once over budget. */
  readonly remaining: Money;
  /** Spent ÷ budget; can exceed 1. */
  readonly ratio: number;
  readonly state: BudgetState;
}

export function budgetStatus(budget: Budget, spent: Money): BudgetStatus {
  const ratio = budget.amount.isZero() ? 1 : spent.minor / budget.amount.minor;
  return {
    budget,
    spent,
    remaining: budget.amount.subtract(spent),
    ratio,
    state: ratio > 1 ? "over" : ratio >= NEAR_LIMIT ? "near" : "under",
  };
}

export function assertBudgetAmount(amount: Money): void {
  if (amount.isZero() || amount.isNegative()) {
    throw new ValidationError("A budget must be more than zero");
  }
}

/** Most urgent first: over before near, then by how far through the budget. */
export function byUrgency(a: BudgetStatus, b: BudgetStatus): number {
  const rank = { over: 0, near: 1, under: 2 } as const;
  return rank[a.state] - rank[b.state] || b.ratio - a.ratio;
}
