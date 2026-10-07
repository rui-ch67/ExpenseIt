import { beforeEach, describe, expect, it } from "vitest";
import { createServices, type Services } from "@/server/container";
import { parseYearMonth } from "@/domain/dates";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";

let services: Services;
let clock: FixedClock;
const user = "alice";

beforeEach(async () => {
  const db = await createTestDb();
  clock = new FixedClock("2026-10-07");
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({ "EUR→GBP": "0.86", "USD→GBP": "0.75" }),
    clock,
  });
  await createUser(db, user);
  await services.accountSetup.setUp({ id: user });
});

const rent = { title: "Rent", amount: "625.00", currency: "GBP", frequency: "monthly", startsOn: "2026-08-31" };

describe("recurring payments", () => {
  it("logs the payments since it started, at the month's last day when needed", async () => {
    const rule = await services.recurring.create(user, rent);
    const { items } = await services.expenses.list(user, { limit: 10, search: "Rent" });
    expect(items.map((e) => e.spentOn)).toEqual(["2026-09-30", "2026-08-31"]);
    expect(items.every((e) => e.recurringRuleId === rule.id)).toBe(true);
    expect(rule.nextDueOn).toBe("2026-10-31");
  });

  it("catches up as days pass, and never logs a payment twice", async () => {
    await services.recurring.create(user, { ...rent, startsOn: "2026-09-01" });
    clock.set("2026-12-02");
    // Creating it on 7 Oct logged Sep and Oct; by 2 Dec, Nov and Dec are due.
    expect(await services.recurring.catchUp(user)).toBe(2);
    expect(await services.recurring.catchUp(user)).toBe(0);
    await Promise.all([services.recurring.catchUp(user), services.recurring.catchUp(user)]);
    const { items } = await services.expenses.list(user, { limit: 20, search: "Rent" });
    expect(items).toHaveLength(4);
  });

  it("converts foreign subscriptions at each payment's own rate", async () => {
    await services.recurring.create(user, {
      title: "GitHub Copilot",
      amount: "10.00",
      currency: "USD",
      frequency: "monthly",
      startsOn: "2026-10-01",
    });
    const [expense] = (await services.expenses.list(user, { limit: 5, search: "Copilot" })).items;
    expect(expense.amount.format()).toBe("US$10.00");
    expect(expense.homeAmount.format()).toBe("£7.50");
  });

  it("stops at its end date", async () => {
    const rule = await services.recurring.create(user, { ...rent, startsOn: "2026-07-01", endsOn: "2026-08-15" });
    expect(rule.nextDueOn).toBeNull();
    const { items } = await services.expenses.list(user, { limit: 10, search: "Rent" });
    expect(items.map((e) => e.spentOn)).toEqual(["2026-08-01", "2026-07-01"]);
  });

  it("skips what fell due while paused", async () => {
    const rule = await services.recurring.create(user, { ...rent, startsOn: "2026-10-01" });
    await services.recurring.setPaused(user, rule.id, true);
    clock.set("2026-12-15");
    expect(await services.recurring.catchUp(user)).toBe(0);
    const resumed = await services.recurring.setPaused(user, rule.id, false);
    expect(resumed.nextDueOn).toBe("2027-01-01");
  });

  it("lists upcoming payments and estimates the monthly cost", async () => {
    await services.recurring.create(user, { ...rent, startsOn: "2026-09-01" });
    await services.recurring.create(user, { title: "Gym", amount: "6.00", currency: "GBP", frequency: "weekly", startsOn: "2026-10-05" });
    const upcoming = await services.recurring.upcoming(user, 14);
    expect(upcoming.map((u) => [u.rule.title, u.dueOn])).toEqual([
      ["Gym", "2026-10-12"],
      ["Gym", "2026-10-19"],
    ]);
    // £625 monthly + £6 × 52 / 12 weekly = £651.00
    expect((await services.recurring.monthlyCost(user)).format()).toBe("£651.00");
  });

  it("projects the month without extrapolating rent as daily spending", async () => {
    // Rent £600 logged on the 1st, a £30 bill still due on the 20th, and £70
    // of everyday spending in the first 7 of 31 days.
    await services.recurring.create(user, { ...rent, amount: "600.00", startsOn: "2026-10-01" });
    await services.recurring.create(user, { title: "Phone", amount: "30.00", currency: "GBP", frequency: "monthly", startsOn: "2026-10-20" });
    await services.expenses.log(user, { title: "Tesco", amount: "70.00", currency: "GBP", spentOn: "2026-10-05" });
    const projected = await services.recurring.projectMonth(user, (await services.insights.monthSummary(user, parseYearMonth("2026-10"))).total);
    // £70 / 7 × 31 = £310 everyday, + £600 rent + £30 phone = £940
    expect(projected.format()).toBe("£940.00");
  });

  it("keeps logged expenses when the rule is deleted", async () => {
    const rule = await services.recurring.create(user, { ...rent, startsOn: "2026-10-01" });
    await services.recurring.delete(user, rule.id);
    const [expense] = (await services.expenses.list(user, { limit: 5, search: "Rent" })).items;
    expect(expense.recurringRuleId).toBeNull();
  });

  it("validates input", async () => {
    await expect(services.recurring.create(user, { ...rent, frequency: "daily" })).rejects.toThrow("frequency");
    await expect(services.recurring.create(user, { ...rent, endsOn: "2026-01-01" })).rejects.toThrow("end date");
  });
});
