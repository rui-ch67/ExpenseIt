/** Display formatting shared by server and client components (en-GB). */
const LOCALE = "en-GB";

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d ?? 1));
}

/** "2026-10" → "October 2026", or "October" with `short`. */
export function formatMonth(yearMonth: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    ...(style === "long" && { year: "numeric" }),
    timeZone: "UTC",
  }).format(utcDate(yearMonth));
}

/** "Today", "Yesterday", or "Mon 6 Oct" (with the year when it isn't this year). */
export function formatDay(iso: string, today: string): string {
  if (iso === today) return "Today";
  const yesterday = utcDate(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (iso === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(iso.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
    timeZone: "UTC",
  }).format(utcDate(iso));
}

/** "2026-10-01" → "1 October". */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", timeZone: "UTC" }).format(
    utcDate(iso),
  );
}

/** Day of the month as an ordinal: 7 → "7th". */
export function ordinal(day: number): string {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][day % 10] ?? "th";
  return `${day}${suffix}`;
}

export function formatMinor(minor: number, currency: string, exponent = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(minor / 10 ** exponent);
}
