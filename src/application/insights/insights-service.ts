import type { Category } from "@/domain/category";
import type { CurrencyCode } from "@/domain/currency";
import {
  addDays,
  addMonths,
  daysInMonth,
  firstDayOf,
  type IsoDate,
  lastDayOf,
  monthOf,
  type YearMonth,
} from "@/domain/dates";
import { Money } from "@/domain/money";
import type { CategoryRepository, Clock, ExpenseRepository } from "../ports";
import type { SettingsService } from "../settings/settings-service";

export interface CategorySpend {
  /** `null` for uncategorised spending. */
  readonly category: Category | null;
  readonly total: Money;
  readonly count: number;
  /** Fraction of the month's total, 0–1. */
  readonly share: number;
}

export interface MonthSummary {
  readonly month: YearMonth;
  readonly currency: CurrencyCode;
  readonly total: Money;
  readonly previousTotal: Money;
  /** Change versus the previous month as a fraction (0.12 = 12% more), or null with nothing to compare. */
  readonly change: number | null;
  /** Average per day so far (whole month once it's over). */
  readonly dailyAverage: Money;
  readonly byCategory: CategorySpend[];
  /** One entry per day of the month, zero-filled. */
  readonly byDay: Array<{ day: IsoDate; total: Money }>;
}

export class InsightsService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly clock: Clock,
  ) {}

  async monthSummary(userId: string, month: YearMonth): Promise<MonthSummary> {
    const currency = await this.settings.homeCurrency(userId);
    const from = firstDayOf(month);
    const to = lastDayOf(month);
    const previous = addMonths(month, -1);

    const [monthTotals, categoryTotals, dayTotals, categories] = await Promise.all([
      this.expenses.totalsByMonth(userId, currency, previous, month),
      this.expenses.totalsByCategory(userId, currency, from, to),
      this.expenses.totalsByDay(userId, currency, from, to),
      this.categories.list(userId),
    ]);

    const totalFor = (m: YearMonth) =>
      Money.ofMinor(monthTotals.find((t) => t.month === m)?.homeMinor ?? 0, currency);
    const total = totalFor(month);
    const previousTotal = totalFor(previous);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const byCategory = categoryTotals
      .map((t) => ({
        category: t.categoryId ? (categoryById.get(t.categoryId) ?? null) : null,
        total: Money.ofMinor(t.homeMinor, currency),
        count: t.count,
        share: total.isZero() ? 0 : t.homeMinor / total.minor,
      }))
      .sort((a, b) => b.total.minor - a.total.minor);

    const dayMap = new Map(dayTotals.map((d) => [d.day, d.homeMinor]));
    const byDay = Array.from({ length: daysInMonth(month) }, (_, i) => {
      const day = addDays(from, i);
      return { day, total: Money.ofMinor(dayMap.get(day) ?? 0, currency) };
    });

    return {
      month,
      currency,
      total,
      previousTotal,
      change: previousTotal.isZero()
        ? null
        : (total.minor - previousTotal.minor) / previousTotal.minor,
      dailyAverage: this.dailyAverage(total, month),
      byCategory,
      byDay,
    };
  }

  /** Totals for the `count` months ending at `endMonth`, oldest first, zero-filled. */
  async monthlyTrend(
    userId: string,
    count: number,
    endMonth: YearMonth = monthOf(this.clock.today()),
  ): Promise<Array<{ month: YearMonth; total: Money }>> {
    const currency = await this.settings.homeCurrency(userId);
    const startMonth = addMonths(endMonth, -(count - 1));
    const totals = await this.expenses.totalsByMonth(userId, currency, startMonth, endMonth);
    const byMonth = new Map(totals.map((t) => [t.month, t.homeMinor]));
    return Array.from({ length: count }, (_, i) => {
      const month = addMonths(startMonth, i);
      return { month, total: Money.ofMinor(byMonth.get(month) ?? 0, currency) };
    });
  }

  private dailyAverage(total: Money, month: YearMonth): Money {
    const today = this.clock.today();
    const currentMonth = monthOf(today);
    if (month > currentMonth) return Money.zero(total.currency);
    const days = month === currentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
    return Money.ofMinor(Math.round(total.minor / days), total.currency);
  }
}
