import { parseCurrencyCode } from "@/domain/currency";
import { addDays, daysInMonth, firstDayOf, type IsoDate, lastDayOf, monthOf, parseIsoDate } from "@/domain/dates";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { normaliseNote, normaliseTitle } from "@/domain/expense";
import { Money } from "@/domain/money";
import {
  type Frequency,
  occurrenceAfter,
  occurrencesBetween,
  parseFrequency,
  perMonthFactor,
  type RecurringRule,
} from "@/domain/recurrence";
import type { CurrencyConverter } from "../currency/currency-converter";
import type { ExpenseService } from "../expenses/expense-service";
import type {
  CategoryRepository,
  Clock,
  ExpenseRepository,
  NewRecurringRule,
  RecurringRuleRepository,
} from "../ports";
import type { SettingsService } from "../settings/settings-service";

/** What the recurring-payment form submits. */
export interface RecurringInput {
  readonly title: string;
  readonly amount: string;
  readonly currency: string;
  readonly frequency: string;
  readonly startsOn: string;
  readonly endsOn?: string | null;
  readonly categoryId?: string | null;
  readonly note?: string;
}

export interface Upcoming {
  readonly rule: RecurringRule;
  readonly dueOn: IsoDate;
}

export class RecurringService {
  constructor(
    private readonly rules: RecurringRuleRepository,
    private readonly expenses: ExpenseService,
    private readonly expensesRepo: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly converter: CurrencyConverter,
    private readonly clock: Clock,
  ) {}

  list(userId: string): Promise<RecurringRule[]> {
    return this.rules.list(userId);
  }

  async get(userId: string, id: string): Promise<RecurringRule> {
    const rule = await this.rules.findById(userId, id);
    if (!rule) throw new NotFoundError("Recurring payment");
    return rule;
  }

  /**
   * Adds a recurring payment. If it started in the past, the payments
   * since then are logged straight away, each at its own day's rate.
   */
  async create(userId: string, input: RecurringInput): Promise<RecurringRule> {
    const fields = await this.prepare(userId, input);
    const rule = await this.rules.create({ userId, ...fields, nextDueOn: fields.startsOn, paused: false });
    await this.catchUp(userId);
    return this.get(userId, rule.id);
  }

  /** Edits apply from now on: payments already logged are left alone. */
  async update(userId: string, id: string, input: RecurringInput): Promise<RecurringRule> {
    const existing = await this.get(userId, id);
    const fields = await this.prepare(userId, input);
    const scheduleChanged =
      fields.startsOn !== existing.startsOn || fields.frequency !== existing.frequency;
    const nextDueOn = scheduleChanged || existing.nextDueOn === null
      ? this.firstDueFromToday(fields.startsOn, fields.frequency)
      : existing.nextDueOn;
    const updated = await this.rules.update(userId, id, {
      ...fields,
      nextDueOn: fields.endsOn && nextDueOn > fields.endsOn ? null : nextDueOn,
    });
    if (!updated) throw new NotFoundError("Recurring payment");
    return updated;
  }

  /** Pausing stops logging; resuming skips what fell due while paused. */
  async setPaused(userId: string, id: string, paused: boolean): Promise<RecurringRule> {
    const rule = await this.get(userId, id);
    const nextDueOn = paused ? rule.nextDueOn : this.firstDueFromToday(rule.startsOn, rule.frequency);
    const updated = await this.rules.update(userId, id, { paused, nextDueOn });
    if (!updated) throw new NotFoundError("Recurring payment");
    return updated;
  }

  /** Stops the schedule. Expenses it already logged are kept. */
  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.rules.delete(userId, id))) throw new NotFoundError("Recurring payment");
  }

  /**
   * Logs every payment that has fallen due. Safe to run any number of times
   * and concurrently: each payment is logged at most once per date.
   * Pass no user to catch up everyone (the daily job). Returns how many
   * expenses were logged.
   */
  async catchUp(userId?: string): Promise<number> {
    const today = this.clock.today();
    let logged = 0;
    for (const rule of await this.rules.listDue(today, userId)) {
      const until = rule.endsOn && rule.endsOn < today ? rule.endsOn : today;
      const dates = occurrencesBetween(rule.startsOn, rule.frequency, rule.nextDueOn!, until);
      if (dates.length > 0) {
        const created = await this.expenses.logMany(
          rule.userId,
          dates.map((spentOn) => ({
            title: rule.title,
            amount: rule.amount.toDecimalString(),
            currency: rule.amount.currency,
            spentOn,
            categoryId: rule.categoryId,
            note: rule.note,
            recurringRuleId: rule.id,
          })),
          { skipDuplicates: true },
        );
        logged += created.length;
      }
      const next = occurrenceAfter(rule.startsOn, rule.frequency, dates.at(-1) ?? addDays(rule.nextDueOn!, -1));
      await this.rules.update(rule.userId, rule.id, {
        nextDueOn: rule.endsOn && next > rule.endsOn ? null : next,
      });
    }
    return logged;
  }

  /** Payments due in the next `days` days, soonest first. */
  async upcoming(userId: string, days = 30): Promise<Upcoming[]> {
    const today = this.clock.today();
    const until = addDays(today, days);
    const rules = await this.rules.list(userId);
    return rules
      .filter((r) => !r.paused && r.nextDueOn)
      .flatMap((rule) =>
        occurrencesBetween(rule.startsOn, rule.frequency, addDays(today, 1), rule.endsOn && rule.endsOn < until ? rule.endsOn : until).map(
          (dueOn) => ({ rule, dueOn }),
        ),
      )
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }

  /**
   * Roughly what active recurring payments cost per month in the home
   * currency, at today's rates. An estimate: weekly payments vary by month.
   */
  async monthlyCost(userId: string): Promise<Money> {
    const home = await this.settings.homeCurrency(userId);
    const today = this.clock.today();
    let total = Money.zero(home);
    for (const rule of await this.rules.list(userId)) {
      if (rule.paused || !rule.nextDueOn) continue;
      const { converted } = await this.converter.convert(rule.amount, home, today);
      total = total.add(Money.ofMinor(Math.round(converted.minor * perMonthFactor(rule.frequency)), home));
    }
    return total;
  }

  /**
   * Where this month's spending is heading: everyday spending continues at
   * its pace so far, while recurring payments count at their real amounts,
   * logged or still due. (Extrapolating rent paid on the 1st as if it were
   * daily spending would wildly overstate the month.)
   */
  async projectMonth(userId: string, spentSoFar: Money): Promise<Money> {
    const today = this.clock.today();
    const month = monthOf(today);
    const home = spentSoFar.currency;
    const from = firstDayOf(month);
    const to = lastDayOf(month);
    const recurringSoFar = Money.ofMinor(await this.expensesRepo.recurringTotal(userId, home, from, to), home);
    const everyday = spentSoFar.subtract(recurringSoFar);
    const day = Number(today.slice(8, 10));
    const everydayProjected = Money.ofMinor(Math.round((everyday.minor / day) * daysInMonth(month)), home);

    let stillDue = Money.zero(home);
    for (const { rule, dueOn } of await this.upcoming(userId, daysInMonth(month))) {
      if (dueOn > to) continue;
      stillDue = stillDue.add((await this.converter.convert(rule.amount, home, today)).converted);
    }
    return everydayProjected.add(recurringSoFar).add(stillDue);
  }

  private firstDueFromToday(startsOn: IsoDate, frequency: Frequency): IsoDate {
    const today = this.clock.today();
    return startsOn >= today ? startsOn : occurrenceAfter(startsOn, frequency, addDays(today, -1));
  }

  private async prepare(
    userId: string,
    input: RecurringInput,
  ): Promise<Omit<NewRecurringRule, "userId" | "nextDueOn" | "paused">> {
    const amount = Money.parse(input.amount, parseCurrencyCode(input.currency));
    if (amount.isZero() || amount.isNegative()) throw new ValidationError("Amount must be more than zero");
    const startsOn = parseIsoDate(input.startsOn);
    const endsOn = input.endsOn ? parseIsoDate(input.endsOn) : null;
    if (endsOn && endsOn < startsOn) throw new ValidationError("The end date must be after the start date");
    const categoryId = input.categoryId || null;
    if (categoryId && !(await this.categories.findById(userId, categoryId))) {
      throw new ValidationError("That category doesn't exist");
    }
    return {
      title: normaliseTitle(input.title),
      note: normaliseNote(input.note),
      categoryId,
      amount,
      frequency: parseFrequency(input.frequency),
      startsOn,
      endsOn,
    };
  }
}
