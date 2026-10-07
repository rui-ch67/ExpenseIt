import { describe, expect, it } from "vitest";
import { parseIsoDate } from "./dates";
import { convert, identityRate } from "./exchange-rate";
import { Money } from "./money";

const on = parseIsoDate("2026-10-02");

describe("convert", () => {
  it("converts and rounds to the nearest minor unit", () => {
    // €18.50 at 0.8721 = £16.13385 → £16.13
    const pounds = convert(Money.parse("18.50", "EUR"), {
      base: "EUR",
      quote: "GBP",
      rate: "0.8721",
      publishedOn: on,
    });
    expect(pounds.toDecimalString()).toBe("16.13");
    expect(pounds.currency).toBe("GBP");
  });

  it("rounds half away from zero", () => {
    const rate = { base: "GBP", quote: "EUR", rate: "1.5", publishedOn: on } as const;
    expect(convert(Money.ofMinor(1, "GBP"), rate).minor).toBe(2); // 1.5p → 2c
    expect(convert(Money.ofMinor(-1, "GBP"), rate).minor).toBe(-2);
  });

  it("handles currencies with different minor units", () => {
    // ¥1,000 at 0.0049 = £4.90
    const pounds = convert(Money.parse("1000", "JPY"), {
      base: "JPY",
      quote: "GBP",
      rate: "0.0049",
      publishedOn: on,
    });
    expect(pounds.toDecimalString()).toBe("4.90");
    // £4.90 at 204.08 = ¥999.992 → ¥1,000
    const yen = convert(pounds, { base: "GBP", quote: "JPY", rate: "204.08", publishedOn: on });
    expect(yen.minor).toBe(1000);
  });

  it("leaves same-currency amounts untouched", () => {
    const amount = Money.parse("3.33", "GBP");
    expect(convert(amount, identityRate("GBP", on))).toBe(amount);
  });

  it("refuses a rate for the wrong currency", () => {
    expect(() =>
      convert(Money.parse("1", "USD"), { base: "EUR", quote: "GBP", rate: "0.8", publishedOn: on }),
    ).toThrow(/Rate is for EUR/);
  });
});
