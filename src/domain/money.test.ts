import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { Money, sum } from "./money";

describe("Money.parse", () => {
  it("reads what people type", () => {
    expect(Money.parse("12.5", "GBP").minor).toBe(1250);
    expect(Money.parse("1,299.99", "GBP").minor).toBe(129999);
    expect(Money.parse("£4.20", "GBP").minor).toBe(420);
    expect(Money.parse(" 7 ", "GBP").minor).toBe(700);
    expect(Money.parse("500", "JPY").minor).toBe(500);
  });

  it("refuses to silently round extra decimals", () => {
    expect(() => Money.parse("1.234", "GBP")).toThrow(ValidationError);
    expect(() => Money.parse("1.5", "JPY")).toThrow(/can't have decimals/);
  });

  it("rejects text that isn't an amount", () => {
    for (const input of ["", "abc", "1.2.3", "12abc"]) {
      expect(() => Money.parse(input, "GBP")).toThrow(ValidationError);
    }
  });
});

describe("Money arithmetic", () => {
  it("adds exactly where floating point would drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in floating point.
    const total = Money.parse("0.10", "GBP").add(Money.parse("0.20", "GBP"));
    expect(total.toDecimalString()).toBe("0.30");
  });

  it("won't mix currencies", () => {
    expect(() => Money.parse("1", "GBP").add(Money.parse("1", "EUR"))).toThrow(
      /without converting/,
    );
  });

  it("sums a list", () => {
    const amounts = ["1.10", "2.20", "3.30"].map((a) => Money.parse(a, "GBP"));
    expect(sum(amounts, "GBP").toDecimalString()).toBe("6.60");
  });
});

describe("Money.allocate", () => {
  it("always adds back up to the original amount", () => {
    const parts = Money.ofMinor(1000, "GBP").allocate([1, 1, 1]);
    expect(parts.map((p) => p.minor)).toEqual([334, 333, 333]);
    expect(sum(parts, "GBP").minor).toBe(1000);
  });

  it("splits a discount in proportion to item prices", () => {
    // £2.00 off a receipt with £16.00 of food and £4.00 of household items.
    const discount = Money.parse("2.00", "GBP").allocate([1600, 400]);
    expect(discount.map((d) => d.toDecimalString())).toEqual(["1.60", "0.40"]);
  });

  it("gives leftover pennies to the largest remainders", () => {
    const parts = Money.ofMinor(100, "GBP").allocate([333, 333, 334]);
    expect(sum(parts, "GBP").minor).toBe(100);
    expect(parts.map((p) => p.minor)).toEqual([33, 33, 34]);
  });

  it("handles negative amounts and all-zero weights", () => {
    expect(Money.ofMinor(-10, "GBP").allocate([1, 1, 1]).map((p) => p.minor)).toEqual([
      -4, -3, -3,
    ]);
    expect(Money.ofMinor(10, "GBP").allocate([0, 0]).map((p) => p.minor)).toEqual([5, 5]);
  });

  it("stays exact for very large amounts", () => {
    const big = Money.ofMinor(9_000_000_000_000, "GBP");
    expect(sum(big.allocate([3, 7]), "GBP").minor).toBe(9_000_000_000_000);
  });
});

describe("Money formatting", () => {
  it("formats with the currency's own decimals", () => {
    expect(Money.parse("1234.5", "GBP").format()).toBe("£1,234.50");
    expect(Money.parse("1500", "JPY").format()).toBe("JP¥1,500");
    expect(Money.ofMinor(-5, "GBP").toDecimalString()).toBe("-0.05");
  });
});
