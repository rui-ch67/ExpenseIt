import { describe, expect, it } from "vitest";
import { parseIsoDate } from "./dates";
import { occurrence, occurrenceAfter, occurrencesBetween } from "./recurrence";

const d = parseIsoDate;

describe("recurring schedules", () => {
  it("keeps the anchor's day, falling back to the month's last day", () => {
    const rent = d("2026-01-31");
    expect([0, 1, 2, 3, 4].map((n) => occurrence(rent, "monthly", n))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("handles leap days on yearly schedules", () => {
    const birthday = d("2028-02-29");
    expect(occurrence(birthday, "yearly", 1)).toBe("2029-02-28");
    expect(occurrence(birthday, "yearly", 4)).toBe("2032-02-29");
  });

  it("finds the next occurrence after any date", () => {
    expect(occurrenceAfter(d("2026-01-12"), "monthly", d("2026-10-07"))).toBe("2026-10-12");
    expect(occurrenceAfter(d("2026-01-12"), "monthly", d("2026-10-12"))).toBe("2026-11-12");
    expect(occurrenceAfter(d("2026-10-01"), "weekly", d("2026-10-07"))).toBe("2026-10-08");
    expect(occurrenceAfter(d("2020-03-15"), "yearly", d("2026-10-07"))).toBe("2027-03-15");
  });

  it("lists every occurrence in a range, inclusive", () => {
    expect(occurrencesBetween(d("2026-08-03"), "monthly", d("2026-08-01"), d("2026-10-07"))).toEqual([
      "2026-08-03",
      "2026-09-03",
      "2026-10-03",
    ]);
    expect(occurrencesBetween(d("2026-09-28"), "weekly", d("2026-10-01"), d("2026-10-14"))).toEqual([
      "2026-10-05",
      "2026-10-12",
    ]);
    expect(occurrencesBetween(d("2026-11-01"), "monthly", d("2026-10-01"), d("2026-10-31"))).toEqual([]);
  });
});
