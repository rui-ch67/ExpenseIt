import { beforeEach, describe, expect, it } from "vitest";
import { parseIsoDate } from "@/domain/dates";
import { ValidationError } from "@/domain/errors";
import { createServices, type Services } from "@/server/container";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleReceiptRepository } from "@/infrastructure/repositories/drizzle-receipt-repository";

let db: Database;
let services: Services;
let rates: FakeExchangeRates;
const alice = "alice";
const bob = "bob";

beforeEach(async () => {
  db = await createTestDb();
  rates = new FakeExchangeRates({ "EUR→GBP": "0.8721", "GBP→EUR": "1.1466" });
  services = createServices(db, { exchangeRates: rates, clock: new FixedClock("2026-10-07") });
  for (const user of [alice, bob]) {
    await createUser(db, user);
    await services.accountSetup.setUp({ id: user });
  }
});

const coffee = {
  title: "  Flat   white ",
  amount: "3.40",
  currency: "GBP",
  spentOn: "2026-10-06",
};

describe("logging expenses", () => {
  it("normalises input and stores the home-currency amount", async () => {
    const expense = await services.expenses.log(alice, coffee);
    expect(expense.title).toBe("Flat white");
    expect(expense.amount.toDecimalString()).toBe("3.40");
    expect(expense.homeAmount.equals(expense.amount)).toBe(true);
    expect(expense.fxRate).toBe("1");
    expect(rates.calls).toBe(0);
  });

  it("converts foreign spending at that day's rate", async () => {
    const expense = await services.expenses.log(alice, {
      title: "Café de Flore",
      amount: "18.50",
      currency: "EUR",
      spentOn: "2026-09-18",
    });
    expect(expense.amount.format()).toBe("€18.50");
    expect(expense.homeAmount.format()).toBe("£16.13");
    expect(expense.fxRate).toBe("0.8721");
  });

  it("asks the rate service only once per currency pair and day", async () => {
    const trip = { title: "Metro", amount: "2.10", currency: "EUR", spentOn: "2026-09-18" };
    await services.expenses.log(alice, trip);
    await services.expenses.log(alice, trip);
    await services.expenses.log(bob, trip);
    expect(rates.calls).toBe(1);
  });

  it("rejects bad input with a readable reason", async () => {
    await expect(services.expenses.log(alice, { ...coffee, amount: "0" })).rejects.toThrow(
      "Amount must be more than zero",
    );
    await expect(services.expenses.log(alice, { ...coffee, title: " " })).rejects.toThrow(
      ValidationError,
    );
    await expect(services.expenses.log(alice, { ...coffee, currency: "XYZ" })).rejects.toThrow(
      "Unsupported currency",
    );
    await expect(services.expenses.log(alice, { ...coffee, spentOn: "2026-02-30" })).rejects.toThrow(
      "not a valid date",
    );
  });

  it("won't file an expense under someone else's category or receipt", async () => {
    const [bobsCategory] = await services.categories.list(bob);
    await expect(
      services.expenses.log(alice, { ...coffee, categoryId: bobsCategory.id }),
    ).rejects.toThrow("That category doesn't exist");

    const bobsReceipt = await new DrizzleReceiptRepository(db).create({
      userId: bob,
      status: "ready",
      merchant: "Tesco",
      purchasedOn: null,
      currency: "GBP",
      total: null,
      imagePath: null,
      items: [],
    });
    await expect(
      services.expenses.log(alice, { ...coffee, receiptId: bobsReceipt.id }),
    ).rejects.toThrow("That receipt doesn't exist");
  });
});

describe("editing and deleting", () => {
  it("keeps the receipt link when an expense is edited (v1 dropped it)", async () => {
    const receipt = await new DrizzleReceiptRepository(db).create({
      userId: alice,
      status: "ready",
      merchant: "Pret",
      purchasedOn: null,
      currency: "GBP",
      total: null,
      imagePath: null,
      items: [],
    });
    const expense = await services.expenses.log(alice, { ...coffee, receiptId: receipt.id });
    const edited = await services.expenses.update(alice, expense.id, { ...coffee, title: "Latte" });
    expect(edited.title).toBe("Latte");
    expect(edited.receiptId).toBe(receipt.id);
  });

  it("only lets the owner see, change or delete an expense", async () => {
    const expense = await services.expenses.log(alice, coffee);
    await expect(services.expenses.get(bob, expense.id)).rejects.toThrow("Expense not found");
    await expect(services.expenses.update(bob, expense.id, coffee)).rejects.toThrow("not found");
    await expect(services.expenses.delete(bob, expense.id)).rejects.toThrow("not found");
    expect((await services.expenses.get(alice, expense.id)).id).toBe(expense.id);
  });

  it("keeps expenses when their category is deleted (v1 deleted them)", async () => {
    const [food] = await services.categories.list(alice);
    const expense = await services.expenses.log(alice, { ...coffee, categoryId: food.id });
    await services.categories.delete(alice, food.id);
    const after = await services.expenses.get(alice, expense.id);
    expect(after.categoryId).toBeNull();
  });
});

describe("listing", () => {
  beforeEach(async () => {
    const [food, grocery] = await services.categories.list(alice);
    const rows = [
      { title: "Tesco", amount: "23.10", spentOn: "2026-10-01", categoryId: grocery.id },
      { title: "Pret", amount: "6.20", spentOn: "2026-10-02", categoryId: food.id },
      { title: "Greggs", amount: "2.85", spentOn: "2026-10-03", categoryId: food.id },
      { title: "50% off socks", amount: "4.00", spentOn: "2026-10-04", categoryId: null },
      { title: "Aldi", amount: "18.40", spentOn: "2026-10-05", categoryId: grocery.id },
    ];
    for (const row of rows) await services.expenses.log(alice, { ...row, currency: "GBP" });
  });

  it("returns newest first and pages with a stable cursor", async () => {
    const first = await services.expenses.list(alice, { limit: 2 });
    expect(first.items.map((e) => e.title)).toEqual(["Aldi", "50% off socks"]);
    const second = await services.expenses.list(alice, { limit: 2, cursor: first.nextCursor! });
    expect(second.items.map((e) => e.title)).toEqual(["Greggs", "Pret"]);
    const third = await services.expenses.list(alice, { limit: 2, cursor: second.nextCursor! });
    expect(third.items.map((e) => e.title)).toEqual(["Tesco"]);
    expect(third.nextCursor).toBeNull();
  });

  it("filters by search, category, date and amount", async () => {
    const titles = async (query: Parameters<Services["expenses"]["list"]>[1]) =>
      (await services.expenses.list(alice, query)).items.map((e) => e.title);
    const [food] = await services.categories.list(alice);

    expect(await titles({ limit: 10, search: "pret" })).toEqual(["Pret"]);
    // "%" is matched literally, not as a wildcard.
    expect(await titles({ limit: 10, search: "50%" })).toEqual(["50% off socks"]);
    expect(await titles({ limit: 10, categoryIds: [food.id] })).toEqual(["Greggs", "Pret"]);
    expect(await titles({ limit: 10, categoryIds: ["none"] })).toEqual(["50% off socks"]);
    expect(
      await titles({ limit: 10, from: parseIsoDate("2026-10-02"), to: parseIsoDate("2026-10-03") }),
    ).toEqual(["Greggs", "Pret"]);
    expect(await titles({ limit: 10, minHomeMinor: 1000 })).toEqual(["Aldi", "Tesco"]);
  });

  it("never shows one user's expenses to another", async () => {
    expect((await services.expenses.list(bob, { limit: 10 })).items).toEqual([]);
  });

  it("rejects silly page sizes", async () => {
    await expect(services.expenses.list(alice, { limit: 0 })).rejects.toThrow("Page size");
    await expect(services.expenses.list(alice, { limit: 1000 })).rejects.toThrow("Page size");
  });
});
