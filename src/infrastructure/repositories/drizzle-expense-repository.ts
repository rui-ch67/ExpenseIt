import { and, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, type SQL, sql } from "drizzle-orm";
import type {
  CategoryTotal,
  DayTotal,
  ExpensePatch,
  ExpenseQuery,
  ExpenseRepository,
  HomeAmountUpdate,
  MonthTotal,
  NewExpense,
  Page,
} from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { firstDayOf, type IsoDate, lastDayOf, type YearMonth } from "@/domain/dates";
import type { Expense } from "@/domain/expense";
import type { Database } from "../db/client";
import { expenses } from "../db/schema";
import { decodeCursor, encodeCursor } from "./cursor";
import { toExpense } from "./mappers";

const BATCH_SIZE = 500;

type ExpenseRow = typeof expenses.$inferInsert;

function toRow(expense: NewExpense): ExpenseRow {
  return {
    userId: expense.userId,
    title: expense.title,
    note: expense.note,
    categoryId: expense.categoryId,
    receiptId: expense.receiptId,
    spentOn: expense.spentOn,
    amountMinor: expense.amount.minor,
    currency: expense.amount.currency,
    homeAmountMinor: expense.homeAmount.minor,
    homeCurrency: expense.homeAmount.currency,
    fxRate: expense.fxRate,
    fxRateDate: expense.fxRateDate,
  };
}

function toPatch(patch: ExpensePatch): Partial<ExpenseRow> {
  const { amount, homeAmount, ...rest } = patch;
  return {
    ...rest,
    ...(amount && { amountMinor: amount.minor, currency: amount.currency }),
    ...(homeAmount && {
      homeAmountMinor: homeAmount.minor,
      homeCurrency: homeAmount.currency,
    }),
  };
}

/** Escapes LIKE wildcards so a search for "50%" means the literal text. */
function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

const homeTotal = sql<number>`coalesce(sum(${expenses.homeAmountMinor}), 0)`.mapWith(Number);

export class DrizzleExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: Database) {}

  async create(expense: NewExpense): Promise<Expense> {
    const [row] = await this.db.insert(expenses).values(toRow(expense)).returning();
    return toExpense(row);
  }

  async createMany(list: readonly NewExpense[]): Promise<Expense[]> {
    const created: Expense[] = [];
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const rows = await this.db
        .insert(expenses)
        .values(list.slice(i, i + BATCH_SIZE).map(toRow))
        .returning();
      created.push(...rows.map(toExpense));
    }
    return created;
  }

  async listByReceipt(userId: string, receiptId: string): Promise<Expense[]> {
    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.receiptId, receiptId)))
      .orderBy(desc(expenses.homeAmountMinor));
    return rows.map(toExpense);
  }

  async findById(userId: string, id: string): Promise<Expense | null> {
    const [row] = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
    return row ? toExpense(row) : null;
  }

  async update(userId: string, id: string, patch: ExpensePatch): Promise<Expense | null> {
    const [row] = await this.db
      .update(expenses)
      .set(toPatch(patch))
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
      .returning();
    return row ? toExpense(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
      .returning({ id: expenses.id });
    return deleted.length > 0;
  }

  async list(userId: string, query: ExpenseQuery): Promise<Page<Expense>> {
    const conditions: SQL[] = [eq(expenses.userId, userId), ...this.filters(query)];
    if (query.cursor) {
      const [spentOn, createdAt, id] = decodeCursor(query.cursor, 3);
      conditions.push(
        sql`(${expenses.spentOn}, ${expenses.createdAt}, ${expenses.id}) < (${spentOn}::date, ${createdAt}::timestamptz, ${id}::uuid)`,
      );
    }

    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.spentOn), desc(expenses.createdAt), desc(expenses.id))
      .limit(query.limit + 1);

    const items = rows.slice(0, query.limit).map(toExpense);
    const last = items.at(-1);
    const nextCursor =
      rows.length > query.limit && last
        ? encodeCursor([last.spentOn, last.createdAt.toISOString(), last.id])
        : null;
    return { items, nextCursor };
  }

  async totalsByMonth(
    userId: string,
    homeCurrency: CurrencyCode,
    from: YearMonth,
    to: YearMonth,
  ): Promise<MonthTotal[]> {
    const month = sql<string>`to_char(${expenses.spentOn}, 'YYYY-MM')`;
    const rows = await this.db
      .select({ month, homeMinor: homeTotal })
      .from(expenses)
      .where(this.inRange(userId, homeCurrency, firstDayOf(from), lastDayOf(to)))
      .groupBy(month)
      .orderBy(month);
    return rows.map((r) => ({ month: r.month as YearMonth, homeMinor: r.homeMinor }));
  }

  async totalsByCategory(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
  ): Promise<CategoryTotal[]> {
    return this.db
      .select({
        categoryId: expenses.categoryId,
        homeMinor: homeTotal,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(expenses)
      .where(this.inRange(userId, homeCurrency, from, to))
      .groupBy(expenses.categoryId);
  }

  async totalsByDay(
    userId: string,
    homeCurrency: CurrencyCode,
    from: IsoDate,
    to: IsoDate,
  ): Promise<DayTotal[]> {
    const rows = await this.db
      .select({ day: expenses.spentOn, homeMinor: homeTotal })
      .from(expenses)
      .where(this.inRange(userId, homeCurrency, from, to))
      .groupBy(expenses.spentOn)
      .orderBy(expenses.spentOn);
    return rows.map((r) => ({ day: r.day as IsoDate, homeMinor: r.homeMinor }));
  }

  async listNotInHomeCurrency(userId: string, homeCurrency: CurrencyCode): Promise<Expense[]> {
    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), ne(expenses.homeCurrency, homeCurrency)));
    return rows.map(toExpense);
  }

  /** One UPDATE … FROM (VALUES …) per batch instead of one query per row. */
  async updateHomeAmounts(userId: string, updates: readonly HomeAmountUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const values = sql.join(
          updates
            .slice(i, i + BATCH_SIZE)
            .map(
              (u) =>
                sql`(${u.id}::uuid, ${u.homeAmount.minor}::bigint, ${u.homeAmount.currency}::varchar, ${u.fxRate}::numeric, ${u.fxRateDate}::date)`,
            ),
          sql`, `,
        );
        await tx.execute(sql`
          update ${expenses} set
            home_amount_minor = v.home_minor,
            home_currency = v.home_currency,
            fx_rate = v.fx_rate,
            fx_rate_date = v.fx_rate_date,
            updated_at = now()
          from (values ${values}) as v(id, home_minor, home_currency, fx_rate, fx_rate_date)
          where ${expenses.id} = v.id and ${expenses.userId} = ${userId}
        `);
      }
    });
  }

  private inRange(userId: string, homeCurrency: CurrencyCode, from: IsoDate, to: IsoDate) {
    return and(
      eq(expenses.userId, userId),
      eq(expenses.homeCurrency, homeCurrency),
      gte(expenses.spentOn, from),
      lte(expenses.spentOn, to),
    );
  }

  private filters(query: ExpenseQuery): SQL[] {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(expenses.title, pattern), ilike(expenses.note, pattern))!);
    }
    if (query.categoryIds && query.categoryIds.length > 0) {
      const ids = query.categoryIds.filter((id) => id !== "none");
      const includeNone = ids.length !== query.categoryIds.length;
      const matches: SQL[] = [];
      if (ids.length > 0) matches.push(inArray(expenses.categoryId, ids));
      if (includeNone) matches.push(isNull(expenses.categoryId));
      conditions.push(or(...matches)!);
    }
    if (query.from) conditions.push(gte(expenses.spentOn, query.from));
    if (query.to) conditions.push(lte(expenses.spentOn, query.to));
    if (query.minHomeMinor !== undefined) {
      conditions.push(gte(expenses.homeAmountMinor, query.minHomeMinor));
    }
    if (query.maxHomeMinor !== undefined) {
      conditions.push(lte(expenses.homeAmountMinor, query.maxHomeMinor));
    }
    return conditions;
  }
}
