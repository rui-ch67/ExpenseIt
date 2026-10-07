import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import type { NewRecurringRule, RecurringRuleRepository } from "@/application/ports";
import { parseCurrencyCode } from "@/domain/currency";
import { type IsoDate, parseIsoDate } from "@/domain/dates";
import { Money } from "@/domain/money";
import type { RecurringRule } from "@/domain/recurrence";
import type { Database } from "../db/client";
import { recurringRules } from "../db/schema";

function toRule(row: typeof recurringRules.$inferSelect): RecurringRule {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    note: row.note,
    categoryId: row.categoryId,
    amount: Money.ofMinor(row.amountMinor, parseCurrencyCode(row.currency)),
    frequency: row.frequency,
    startsOn: parseIsoDate(row.startsOn),
    nextDueOn: row.nextDueOn ? parseIsoDate(row.nextDueOn) : null,
    endsOn: row.endsOn ? parseIsoDate(row.endsOn) : null,
    paused: row.paused,
  };
}

function toRow(rule: Partial<Omit<NewRecurringRule, "userId">>) {
  const { amount, ...rest } = rule;
  return { ...rest, ...(amount && { amountMinor: amount.minor, currency: amount.currency }) };
}

export class DrizzleRecurringRuleRepository implements RecurringRuleRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string): Promise<RecurringRule[]> {
    const rows = await this.db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.userId, userId))
      .orderBy(asc(recurringRules.nextDueOn), asc(recurringRules.title));
    return rows.map(toRule);
  }

  async findById(userId: string, id: string): Promise<RecurringRule | null> {
    const [row] = await this.db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)));
    return row ? toRule(row) : null;
  }

  async create(rule: NewRecurringRule): Promise<RecurringRule> {
    const [row] = await this.db
      .insert(recurringRules)
      .values({ userId: rule.userId, ...toRow(rule) } as typeof recurringRules.$inferInsert)
      .returning();
    return toRule(row);
  }

  async update(
    userId: string,
    id: string,
    patch: Partial<Omit<NewRecurringRule, "userId">>,
  ): Promise<RecurringRule | null> {
    const [row] = await this.db
      .update(recurringRules)
      .set({ ...toRow(patch), updatedAt: new Date() })
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
      .returning();
    return row ? toRule(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
      .returning({ id: recurringRules.id });
    return deleted.length > 0;
  }

  async listDue(today: IsoDate, userId?: string): Promise<RecurringRule[]> {
    const rows = await this.db
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.paused, false),
          isNotNull(recurringRules.nextDueOn),
          lte(recurringRules.nextDueOn, today),
          userId ? eq(recurringRules.userId, userId) : undefined,
        ),
      );
    return rows.map(toRule);
  }
}
