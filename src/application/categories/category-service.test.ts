import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/domain/category";
import { createServices, type Services } from "@/server/container";
import { createTestDb, createUser, FakeExchangeRates, FixedClock } from "@/test/helpers";

let services: Services;
const user = "alice";

beforeEach(async () => {
  const db = await createTestDb();
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({}),
    clock: new FixedClock("2026-10-07"),
  });
  await createUser(db, user);
  await services.categories.createDefaults(user);
});

describe("categories", () => {
  it("starts every account with the default set, in order, only once", async () => {
    await services.categories.createDefaults(user);
    const names = (await services.categories.list(user)).map((c) => c.name);
    expect(names).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
  });

  it("adds new categories to the end", async () => {
    const created = await services.categories.create(user, { name: " Pets ", color: "teal" });
    expect(created.name).toBe("Pets");
    expect(created.sortOrder).toBe(DEFAULT_CATEGORIES.length);
  });

  it("keeps names unique regardless of case", async () => {
    await expect(services.categories.create(user, { name: "food", color: "rose" })).rejects.toThrow(
      'You already have a category called "Food"',
    );
    const [food, grocery] = await services.categories.list(user);
    await expect(services.categories.update(user, grocery.id, { name: "FOOD" })).rejects.toThrow(
      "already have",
    );
    // Renaming a category to a new casing of its own name is fine.
    expect((await services.categories.update(user, food.id, { name: "FOOD" })).name).toBe("FOOD");
  });

  it("rejects colours outside the palette", async () => {
    await expect(
      services.categories.create(user, { name: "Pets", color: "#ff0000" }),
    ).rejects.toThrow("Unknown category colour");
  });

  it("reorders, and only accepts a complete ordering", async () => {
    const before = await services.categories.list(user);
    const reversed = [...before].reverse().map((c) => c.id);
    await services.categories.reorder(user, reversed);
    expect((await services.categories.list(user)).map((c) => c.id)).toEqual(reversed);

    await expect(services.categories.reorder(user, reversed.slice(1))).rejects.toThrow(
      "every category exactly once",
    );
    await expect(
      services.categories.reorder(user, [reversed[0], ...reversed.slice(0, -1)]),
    ).rejects.toThrow("every category exactly once");
  });
});
