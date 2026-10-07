import { beforeEach, describe, expect, it } from "vitest";
import { parseYearMonth } from "@/domain/dates";
import { createServices, type Services } from "@/server/container";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";

let services: Services;
const user = "alice";
const october = parseYearMonth("2026-10");

beforeEach(async () => {
  const db = await createTestDb();
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({ "EUR→GBP": "0.8" }),
    clock: new FixedClock("2026-10-10"),
  });
  await createUser(db, user);
  await services.accountSetup.setUp({ id: user });

  const [food, grocery] = await services.categories.list(user);
  const log = (title: string, amount: string, spentOn: string, categoryId: string | null, currency = "GBP") =>
    services.expenses.log(user, { title, amount, currency, spentOn, categoryId });

  await log("Rent", "600.00", "2026-09-01", null);
  await log("Tesco", "40.00", "2026-10-01", grocery.id);
  await log("Aldi", "20.00", "2026-10-04", grocery.id);
  await log("Pret", "10.00", "2026-10-04", food.id);
  await log("Croissant", "5.00", "2026-10-09", food.id, "EUR"); // £4.00
  await log("Charger", "26.00", "2026-10-09", null);
});

describe("month summary", () => {
  it("totals the month in the home currency", async () => {
    const summary = await services.insights.monthSummary(user, october);
    expect(summary.total.format()).toBe("£100.00");
    expect(summary.previousTotal.format()).toBe("£600.00");
    expect(summary.change).toBeCloseTo(-0.8333, 3);
  });

  it("breaks spending down by category, biggest first, including uncategorised", async () => {
    const { byCategory } = await services.insights.monthSummary(user, october);
    expect(byCategory.map((c) => [c.category?.name ?? "Uncategorised", c.total.toDecimalString(), c.count])).toEqual([
      ["Grocery", "60.00", 2],
      ["Uncategorised", "26.00", 1],
      ["Food", "14.00", 2],
    ]);
    expect(byCategory.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1);
  });

  it("zero-fills every day of the month", async () => {
    const { byDay } = await services.insights.monthSummary(user, october);
    expect(byDay).toHaveLength(31);
    expect(byDay[3]).toMatchObject({ day: "2026-10-04" });
    expect(byDay[3].total.toDecimalString()).toBe("30.00");
    expect(byDay[4].total.isZero()).toBe(true);
  });

  it("averages per day so far in the current month", async () => {
    // £100 over the first 10 days of October.
    const { dailyAverage } = await services.insights.monthSummary(user, october);
    expect(dailyAverage.toDecimalString()).toBe("10.00");
  });

  it("reports no change when there's no previous month to compare", async () => {
    const { change } = await services.insights.monthSummary(user, parseYearMonth("2026-09"));
    expect(change).toBeNull();
  });
});

describe("comparing like with like", () => {
  it("compares the month so far with the same days of last month", async () => {
    // Clock is 10 Oct; September's only spend (rent) was on the 1st.
    const summary = await services.insights.monthSummary(user, october);
    expect(summary.previousToDate?.format()).toBe("£600.00");
    expect(summary.count).toBe(5);
    const past = await services.insights.monthSummary(user, parseYearMonth("2026-09"));
    expect(past.previousToDate).toBeNull();
  });
});

describe("month recap", () => {
  it("finds the top category, its places, the favourite place, the biggest day and spending abroad", async () => {
    const recap = await services.insights.monthRecap(user, october);
    expect(recap.topCategory?.category?.name).toBe("Grocery");
    expect(recap.topCategory?.places.map((p) => p.title)).toEqual(["Tesco", "Aldi"]);
    expect(recap.biggestDay?.day).toBe("2026-10-01");
    expect(recap.biggestDay?.total.format()).toBe("£40.00");
    expect(recap.abroad).toEqual([
      expect.objectContaining({ currency: "EUR", count: 1 }),
    ]);
    expect(recap.abroad[0].spent.format()).toBe("€5.00");
    expect(recap.abroad[0].home.format()).toBe("£4.00");
  });

  it("is empty but safe for a month with no spending", async () => {
    const recap = await services.insights.monthRecap(user, parseYearMonth("2026-07"));
    expect(recap.topCategory).toBeNull();
    expect(recap.favouritePlace).toBeNull();
    expect(recap.biggestDay).toBeNull();
    expect(recap.summary.total.isZero()).toBe(true);
  });
});

describe("monthly trend", () => {
  it("returns a zero-filled run of months ending now", async () => {
    const trend = await services.insights.monthlyTrend(user, 3);
    expect(trend.map((t) => [t.month, t.total.toDecimalString()])).toEqual([
      ["2026-08", "0.00"],
      ["2026-09", "600.00"],
      ["2026-10", "100.00"],
    ]);
  });
});
