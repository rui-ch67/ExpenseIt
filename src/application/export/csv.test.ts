import { describe, expect, it } from "vitest";
import { parseIsoDate } from "@/domain/dates";
import { Money } from "@/domain/money";
import { csvField, csvHeader, expenseToCsvRow } from "./csv";

describe("CSV export", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvField("Tesco")).toBe("Tesco");
    expect(csvField("Bread, milk")).toBe('"Bread, milk"');
    expect(csvField('The "good" coffee')).toBe('"The ""good"" coffee"');
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("stops spreadsheets running a cell as a formula", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("+44 7700")).toBe("'+44 7700");
  });

  it("writes one row per expense, in both currencies", () => {
    const row = expenseToCsvRow(
      {
        id: "1",
        userId: "u",
        title: "Café de Flore",
        note: "Weekend in Paris",
        categoryId: "c",
        receiptId: "r",
        recurringRuleId: null,
        spentOn: parseIsoDate("2026-09-18"),
        amount: Money.parse("18.50", "EUR"),
        homeAmount: Money.parse("16.13", "GBP"),
        fxRate: "0.8721",
        fxRateDate: parseIsoDate("2026-09-18"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new Map([["c", { id: "c", userId: "u", name: "Food", color: "orange", sortOrder: 0 }]]),
    );
    expect(csvHeader()).toBe(
      "date,title,category,amount,currency,home_amount,home_currency,exchange_rate,note,from_receipt,recurring\r\n",
    );
    expect(row).toBe("2026-09-18,Café de Flore,Food,18.50,EUR,16.13,GBP,0.8721,Weekend in Paris,yes,no\r\n");
  });
});
