import { and, eq, sql } from "drizzle-orm";
import type { BudgetRepository } from "@/application/ports";
import type { Budget } from "@/domain/budget";
import { parseCurrencyCode } from "@/domain/currency";
import { Money } from "@/domain/money";
import type { Database } from "../db/client";
import { budgets } from "../db/schema";

function toBudget(row: typeof budgets.$inferSelect): Budget {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    amount: Money.ofMinor(row.amountMinor, parseCurrencyCode(row.currency)),
  };
}

export class DrizzleBudgetRepository implements BudgetRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string): Promise<Budget[]> {
    const rows = await this.db.select().from(budgets).where(eq(budgets.userId, userId));
    return rows.map(toBudget);
  }

  async upsert(userId: string, categoryId: string | null, amount: Money): Promise<Budget> {
    const [row] = await this.db
      .insert(budgets)
      .values({ userId, categoryId, amountMinor: amount.minor, currency: amount.currency })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.categoryId],
        set: { amountMinor: amount.minor, currency: amount.currency, updatedAt: new Date() },
      })
      .returning();
    return toBudget(row);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
      .returning({ id: budgets.id });
    return deleted.length > 0;
  }

  async updateAmounts(userId: string, updates: ReadonlyArray<{ id: string; amount: Money }>): Promise<void> {
    if (updates.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const { id, amount } of updates) {
        await tx
          .update(budgets)
          .set({ amountMinor: amount.minor, currency: amount.currency, updatedAt: sql`now()` })
          .where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
      }
    });
  }
}
