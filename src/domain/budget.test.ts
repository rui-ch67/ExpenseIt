import { describe, expect, it } from "vitest";
import { budgetStatus, byUrgency } from "./budget";
import { Money } from "./money";

const gbp = (a: string) => Money.parse(a, "GBP");
const budget = (amount: string, categoryId: string | null = "food") => ({
  id: categoryId ?? "all",
  userId: "u",
  categoryId,
  amount: gbp(amount),
});

describe("budget status", () => {
  it("is under, near from 80%, and over past 100%", () => {
    expect(budgetStatus(budget("50"), gbp("20")).state).toBe("under");
    expect(budgetStatus(budget("50"), gbp("41.70")).state).toBe("near");
    expect(budgetStatus(budget("50"), gbp("50")).state).toBe("near");
    const over = budgetStatus(budget("50"), gbp("62.16"));
    expect(over.state).toBe("over");
    expect(over.remaining.toDecimalString()).toBe("-12.16");
  });

  it("orders the most urgent first", () => {
    const list = [
      budgetStatus(budget("100", "a"), gbp("10")),
      budgetStatus(budget("50", "b"), gbp("45")),
      budgetStatus(budget("20", "c"), gbp("30")),
    ].sort(byUrgency);
    expect(list.map((s) => s.budget.categoryId)).toEqual(["c", "b", "a"]);
  });
});
