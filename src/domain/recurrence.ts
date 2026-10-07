import { addDays, addMonths, daysInMonth, type IsoDate, type YearMonth } from "./dates";
import { ValidationError } from "./errors";
import type { Money } from "./money";

export const FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export function parseFrequency(value: string): Frequency {
  if ((FREQUENCIES as readonly string[]).includes(value)) return value as Frequency;
  throw new ValidationError(`"${value}" isn't a supported frequency`);
}

/**
 * The nth occurrence of a schedule that started on `anchor` (n = 0 is the
 * anchor itself). Monthly and yearly schedules keep the anchor's day where
 * the month has it and fall back to the month's last day where it doesn't,
 * so rent on the 31st lands on 30 April and 28 (or 29) February, then on
 * 31 May again.
 */
export function occurrence(anchor: IsoDate, frequency: Frequency, n: number): IsoDate {
  if (frequency === "weekly") return addDays(anchor, 7 * n);
  const anchorMonth = anchor.slice(0, 7) as YearMonth;
  const month = addMonths(anchorMonth, frequency === "monthly" ? n : 12 * n);
  const day = Math.min(Number(anchor.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}` as IsoDate;
}

/** The first occurrence strictly after `date`. */
export function occurrenceAfter(anchor: IsoDate, frequency: Frequency, date: IsoDate): IsoDate {
  // Jump close to `date` first, so long-running schedules don't iterate from the start.
  const days = Math.max(0, (Date.parse(date) - Date.parse(anchor)) / 86_400_000);
  const approx = frequency === "weekly" ? days / 7 : frequency === "monthly" ? days / 30.44 : days / 365.25;
  let n = Math.max(0, Math.floor(approx) - 1);
  while (occurrence(anchor, frequency, n) <= date) n += 1;
  return occurrence(anchor, frequency, n);
}

/** Every occurrence from `from` up to and including `to`, oldest first. */
export function occurrencesBetween(
  anchor: IsoDate,
  frequency: Frequency,
  from: IsoDate,
  to: IsoDate,
): IsoDate[] {
  const dates: IsoDate[] = [];
  let next = from <= anchor ? anchor : occurrenceAfter(anchor, frequency, addDays(from, -1));
  while (next <= to) {
    dates.push(next);
    next = occurrenceAfter(anchor, frequency, next);
  }
  return dates;
}

/** How much a schedule costs per month on average, as a multiplier of its amount. */
export function perMonthFactor(frequency: Frequency): number {
  return frequency === "weekly" ? 52 / 12 : frequency === "monthly" ? 1 : 1 / 12;
}

/** A payment that repeats: rent, a phone contract, a subscription. */
export interface RecurringRule {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly note: string;
  readonly categoryId: string | null;
  readonly amount: Money;
  readonly frequency: Frequency;
  /** The first payment; later ones repeat from this date. */
  readonly startsOn: IsoDate;
  /** The next payment not logged yet, or null once the schedule has ended. */
  readonly nextDueOn: IsoDate | null;
  readonly endsOn: IsoDate | null;
  readonly paused: boolean;
}
