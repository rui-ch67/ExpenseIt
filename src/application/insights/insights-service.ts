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
  /** Number of expenses in the month. */
  readonly count: number;
  readonly previousTotal: Money;
  /** Change versus the previous month as a fraction (0.12 = 12% more), or null with nothing to compare. */
  readonly change: number | null;
  /**
   * For the month in progress: what the previous month had cost by the
   * same day, so "so far" compares like with like. Null for past months.
   */
  readonly previousToDate: Money | null;
  /** Average per day so far (whole month once it's over). */
  readonly dailyAverage: Money;
  readonly byCategory: CategorySpend[];
  /** One entry per day of the month, zero-filled. */
  readonly byDay: Array<{ day: IsoDate; total: Money }>;
}

export interface PlaceSpend {
  readonly title: string;
  readonly count: number;
  readonly total: Money;
}

/** Everything the monthly "wrapped" stories need, computed in one place. */
export interface MonthRecap {
  readonly summary: MonthSummary;
  /** The biggest category, with the places that made it up. */
  readonly topCategory: (CategorySpend & { readonly places: PlaceSpend[] }) | null;
  /** The place visited most often. */
  readonly favouritePlace: PlaceSpend | null;
  readonly biggestDay: { readonly day: IsoDate; readonly total: Money } | null;
  /** Spending in other currencies, largest first. */
  readonly abroad: Array<{ currency: CurrencyCode; spent: Money; home: Money; count: number }>;
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
    const today = this.clock.today();
    const inProgress = monthOf(today) === month;

    const [monthTotals, categoryTotals, dayTotals, previousDays, categories] = await Promise.all([
      this.expenses.totalsByMonth(userId, currency, previous, month),
      this.expenses.totalsByCategory(userId, currency, from, to),
      this.expenses.totalsByDay(userId, currency, from, to),
      inProgress
        ? this.expenses.totalsByDay(userId, currency, firstDayOf(previous), lastDayOf(previous))
        : Promise.resolve([]),
      this.categories.list(userId),
    ]);

    const money = (minor: number) => Money.ofMinor(minor, currency);
    const totalFor = (m: YearMonth) => money(monthTotals.find((t) => t.month === m)?.homeMinor ?? 0);
    const total = totalFor(month);
    const previousTotal = totalFor(previous);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const byCategory = categoryTotals
      .map((t) => ({
        category: t.categoryId ? (categoryById.get(t.categoryId) ?? null) : null,
        total: money(t.homeMinor),
        count: t.count,
        share: total.isZero() ? 0 : t.homeMinor / total.minor,
      }))
      .sort((a, b) => b.total.minor - a.total.minor);

    const dayMap = new Map(dayTotals.map((d) => [d.day, d.homeMinor]));
    const byDay = Array.from({ length: daysInMonth(month) }, (_, i) => {
      const day = addDays(from, i);
      return { day, total: money(dayMap.get(day) ?? 0) };
    });

    // Same day-of-month last month, capped at that month's length (31 Mar → 28 Feb).
    const dayOfMonth = Math.min(Number(today.slice(8, 10)), daysInMonth(previous));
    const cutoff = addDays(firstDayOf(previous), dayOfMonth - 1);
    const previousToDate = inProgress
      ? money(previousDays.filter((d) => d.day <= cutoff).reduce((sum, d) => sum + d.homeMinor, 0))
      : null;

    return {
      month,
      currency,
      total,
      count: categoryTotals.reduce((sum, t) => sum + t.count, 0),
      previousTotal,
      change: previousTotal.isZero()
        ? null
        : (total.minor - previousTotal.minor) / previousTotal.minor,
      previousToDate,
      dailyAverage: this.dailyAverage(total, month),
      byCategory,
      byDay,
    };
  }

  async monthRecap(userId: string, month: YearMonth): Promise<MonthRecap> {
    const summary = await this.monthSummary(userId, month);
    const { currency } = summary;
    const from = firstDayOf(month);
    const to = lastDayOf(month);
    const top = summary.byCategory[0] ?? null;

    const [places, topPlaces, currencies] = await Promise.all([
      this.expenses.totalsByMerchant(userId, currency, from, to, { limit: 1 }),
      top
        ? this.expenses.totalsByMerchant(userId, currency, from, to, {
            categoryId: top.category?.id ?? null,
            limit: 3,
          })
        : Promise.resolve([]),
      this.expenses.totalsByCurrency(userId, currency, from, to),
    ]);

    const toPlace = (p: (typeof places)[number]): PlaceSpend => ({
      title: p.title,
      count: p.count,
      total: Money.ofMinor(p.homeMinor, currency),
    });
    const biggest = summary.byDay.reduce<(typeof summary.byDay)[number] | null>(
      (best, d) => (d.total.minor > (best?.total.minor ?? 0) ? d : best),
      null,
    );

    return {
      summary,
      topCategory: top ? { ...top, places: topPlaces.map(toPlace) } : null,
      favouritePlace: places[0] ? toPlace(places[0]) : null,
      biggestDay: biggest,
      abroad: currencies
        .filter((c) => c.currency !== currency)
        .map((c) => ({
          currency: c.currency,
          spent: Money.ofMinor(c.amountMinor, c.currency),
          home: Money.ofMinor(c.homeMinor, currency),
          count: c.count,
        })),
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

  currentMonth(): YearMonth {
    return monthOf(this.clock.today());
  }

  private dailyAverage(total: Money, month: YearMonth): Money {
    const today = this.clock.today();
    const currentMonth = monthOf(today);
    if (month > currentMonth) return Money.zero(total.currency);
    const days = month === currentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
    return Money.ofMinor(Math.round(total.minor / days), total.currency);
  }
}
