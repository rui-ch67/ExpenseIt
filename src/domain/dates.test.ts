import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  lastDayOf,
  parseIsoDate,
  parseYearMonth,
  todayIn,
} from "./dates";
import { ValidationError } from "./errors";

describe("calendar dates", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(parseIsoDate("2028-02-29")).toBe("2028-02-29");
    for (const bad of ["2026-02-30", "2026-13-01", "26-01-01", "2026-1-1", ""]) {
      expect(() => parseIsoDate(bad)).toThrow(ValidationError);
    }
  });

  it("does month arithmetic across year boundaries", () => {
    const jan = parseYearMonth("2026-01");
    expect(addMonths(jan, -1)).toBe("2025-12");
    expect(addMonths(jan, 13)).toBe("2027-02");
    expect(lastDayOf(parseYearMonth("2028-02"))).toBe("2028-02-29");
    expect(daysInMonth(parseYearMonth("2026-04"))).toBe(30);
    expect(addDays(parseIsoDate("2026-12-31"), 1)).toBe("2027-01-01");
  });

  it("knows what day it is in London, not in UTC", () => {
    // 23:30 UTC on 31 July is 00:30 on 1 August in London (BST).
    // v1 bucketed this purchase into July.
    const lateNight = new Date("2026-07-31T23:30:00Z");
    expect(todayIn("Europe/London", lateNight)).toBe("2026-08-01");
    expect(todayIn("UTC", lateNight)).toBe("2026-07-31");
  });
});
