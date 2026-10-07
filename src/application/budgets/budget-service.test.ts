import { beforeEach, describe, expect, it } from "vitest";
import { createServices, type Services } from "@/server/container";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";

let services: Services;
const user = "alice";

beforeEach(async () => {
  const db = await createTestDb();
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({ "GBP→EUR": "1.25" }),
    clock: new FixedClock("2026-10-07"),
  });
  await createUser(db, user);
  await services.accountSetup.setUp({ id: user });
  const [food, grocery] = await services.categories.list(user);
  const log = (title: string, amount: string, categoryId: string) =>
    services.expenses.log(user, { title, amount, currency: "GBP", spentOn: "2026-10-03", categoryId });
  await log("Pret", "41.70", food.id);
  await log("Tesco", "62.16", grocery.id);
});

describe("budgets", () => {
  it("shows spending against each budget this month, most urgent first", async () => {
    const [food, grocery] = await services.categories.list(user);
    await services.budgets.set(user, food.id, "50");
    await services.budgets.set(user, grocery.id, "150");
    await services.budgets.set(user, null, "100");

    const { overall, categories, unbudgeted } = await services.budgets.overview(user);
    expect(categories.map((c) => [c.category.name, c.state, c.remaining.format()])).toEqual([
      ["Food", "near", "£8.30"],
      ["Grocery", "under", "£87.84"],
    ]);
    expect(overall?.state).toBe("over");
    expect(overall?.remaining.format()).toBe("-£3.86");
    expect(unbudgeted.map((c) => c.name)).not.toContain("Food");
  });

  it("picks the most urgent warning for the home screen", async () => {
    const [food] = await services.categories.list(user);
    await services.budgets.set(user, food.id, "50");
    expect((await services.budgets.mostUrgent(user))?.category?.name).toBe("Food");
    await services.budgets.set(user, null, "100");
    expect((await services.budgets.mostUrgent(user))?.category).toBeNull();
  });

  it("replaces a budget instead of adding a second one", async () => {
    const [food] = await services.categories.list(user);
    await services.budgets.set(user, food.id, "50");
    await services.budgets.set(user, food.id, "80");
    const { categories } = await services.budgets.overview(user);
    expect(categories).toHaveLength(1);
    expect(categories[0].budget.amount.format()).toBe("£80.00");
  });

  it("converts budgets when the home currency changes", async () => {
    const [food] = await services.categories.list(user);
    await services.budgets.set(user, food.id, "40");
    await services.settings.changeHomeCurrency(user, "EUR");
    const { categories } = await services.budgets.overview(user);
    expect(categories[0].budget.amount.format()).toBe("€50.00");
  });

  it("rejects zero and unknown categories", async () => {
    await expect(services.budgets.set(user, null, "0")).rejects.toThrow("more than zero");
    await expect(services.budgets.set(user, "00000000-0000-0000-0000-000000000000", "10")).rejects.toThrow(
      "doesn't exist",
    );
  });
});
