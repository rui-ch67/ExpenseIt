import { beforeEach, describe, expect, it } from "vitest";
import { parseYearMonth } from "@/domain/dates";
import { createServices, type Services } from "@/server/container";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";

let services: Services;
let rates: FakeExchangeRates;
const user = "alice";

beforeEach(async () => {
  const db = await createTestDb();
  rates = new FakeExchangeRates({ "EUR→GBP": "0.8", "GBP→EUR": "1.25", "EUR→EUR": "1" });
  services = createServices(db, { exchangeRates: rates, clock: new FixedClock("2026-10-10") });
  await createUser(db, user);
  await services.accountSetup.setUp({ id: user });
});

describe("home currency", () => {
  it("defaults to pounds", async () => {
    expect((await services.settings.get(user)).homeCurrency).toBe("GBP");
  });

  it("re-converts every expense when the home currency changes", async () => {
    await services.expenses.log(user, { title: "Tesco", amount: "40.00", currency: "GBP", spentOn: "2026-10-01" });
    await services.expenses.log(user, { title: "Croissant", amount: "5.00", currency: "EUR", spentOn: "2026-10-02" });

    await services.settings.changeHomeCurrency(user, "eur");

    const { items } = await services.expenses.list(user, { limit: 10 });
    const home = Object.fromEntries(items.map((e) => [e.title, e.homeAmount.format()]));
    expect(home).toEqual({ Tesco: "€50.00", Croissant: "€5.00" });
    const summary = await services.insights.monthSummary(user, parseYearMonth("2026-10"));
    expect(summary.total.format()).toBe("€55.00");
  });

  it("changes nothing if the rate service is down", async () => {
    await services.expenses.log(user, { title: "Tesco", amount: "40.00", currency: "GBP", spentOn: "2026-10-01" });
    rates.available = false;

    await expect(services.settings.changeHomeCurrency(user, "EUR")).rejects.toThrow("rates offline");

    expect((await services.settings.get(user)).homeCurrency).toBe("GBP");
    const { items } = await services.expenses.list(user, { limit: 10 });
    expect(items[0].homeAmount.format()).toBe("£40.00");
  });

  it("rejects currencies it can't convert", async () => {
    await expect(services.settings.changeHomeCurrency(user, "BTC")).rejects.toThrow(
      "Unsupported currency",
    );
  });
});
