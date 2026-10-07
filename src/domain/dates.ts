import { ValidationError } from "./errors";

/**
 * A calendar date with no time or time zone, e.g. "2026-10-07".
 *
 * Expenses happen on a day, not at an instant. The Android version stored
 * milliseconds and grouped them by month in UTC, so a purchase at 00:30 in
 * London during summer time landed in the previous day (and sometimes the
 * previous month). Storing the calendar date avoids that whole class of bug.
 */
export type IsoDate = string & { readonly __brand: "IsoDate" };

/** A calendar month, e.g. "2026-10". */
export type YearMonth = string & { readonly __brand: "YearMonth" };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function parseIsoDate(value: string): IsoDate {
  const match = DATE_PATTERN.exec(value);
  if (match) {
    const [, y, m, d] = match.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
    ) {
      return value as IsoDate;
    }
  }
  throw new ValidationError(`"${value}" is not a valid date (expected YYYY-MM-DD)`);
}

export function parseYearMonth(value: string): YearMonth {
  const match = MONTH_PATTERN.exec(value);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return value as YearMonth;
  }
  throw new ValidationError(`"${value}" is not a valid month (expected YYYY-MM)`);
}

export function monthOf(date: IsoDate): YearMonth {
  return date.slice(0, 7) as YearMonth;
}

export function addMonths(month: YearMonth, delta: number): YearMonth {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const monthNumber = (index % 12) + 1;
  return `${year}-${String(monthNumber).padStart(2, "0")}` as YearMonth;
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + delta));
  return shifted.toISOString().slice(0, 10) as IsoDate;
}

export function firstDayOf(month: YearMonth): IsoDate {
  return `${month}-01` as IsoDate;
}

export function lastDayOf(month: YearMonth): IsoDate {
  return addDays(firstDayOf(addMonths(month, 1)), -1);
}

export function daysInMonth(month: YearMonth): number {
  return Number(lastDayOf(month).slice(8, 10));
}

/** Today's date in the given IANA time zone (defaults to the UK). */
export function todayIn(timeZone = "Europe/London", now = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) as IsoDate;
}
