import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { generateDemoExpenses } from "@/application/demo/demo-data";
import { parseIsoDate } from "@/domain/dates";
import type { Database } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema";
import { createTestDb, FakeExchangeRates, FixedClock } from "@/test/helpers";
import { type Auth, createAuth } from "./auth";
import { createServices, type Services } from "./container";
import { cleanupDemoAccounts } from "./demo-cleanup";

const baseURL = "http://localhost:3000";
let db: Database;
let services: Services;
let auth: Auth;

beforeEach(async () => {
  db = await createTestDb();
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({ "EUR→GBP": "0.86" }),
    clock: new FixedClock("2026-10-07"),
  });
  auth = createAuth(db, {
    secret: "test-secret-that-is-long-enough-for-better-auth",
    baseURL,
    rateLimit: true,
    onUserCreated: (user) => services.accountSetup.setUp(user),
  });
});

/** Calls the auth API the way the browser does, through the HTTP handler. */
function post(path: string, body: unknown = {}, ip = "203.0.113.7") {
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseURL, "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("email sign-up", () => {
  it("creates the account with settings and starter categories", async () => {
    const response = await post("/sign-up/email", {
      name: "Rui",
      email: "rui@example.test",
      password: "correct horse battery",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("session_token");

    const { user } = (await response.json()) as { user: { id: string } };
    expect((await services.settings.get(user.id)).homeCurrency).toBe("GBP");
    expect(await services.categories.list(user.id)).toHaveLength(9);
    expect((await services.expenses.list(user.id, { limit: 1 })).items).toHaveLength(0);
  });

  it("rejects short passwords", async () => {
    const response = await post("/sign-up/email", {
      name: "Rui",
      email: "rui@example.test",
      password: "short",
    });
    expect(response.status).toBe(400);
  });
});

describe("Try the demo", () => {
  it("creates an anonymous account filled with sample spending", async () => {
    const response = await post("/sign-in/anonymous");
    expect(response.status).toBe(200);
    const { user } = (await response.json()) as { user: { id: string } };

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.isAnonymous).toBe(true);

    const { items } = await services.expenses.list(user.id, { limit: 100 });
    expect(items.length).toBeGreaterThan(40);
    expect(items.some((e) => e.amount.currency === "EUR")).toBe(true);
    expect(items.every((e) => e.homeAmount.currency === "GBP")).toBe(true);
    expect(items.every((e) => e.categoryId !== null)).toBe(true);
  });

  it("limits how many demo accounts one visitor can create", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post("/sign-in/anonymous")).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    // A different visitor is unaffected.
    expect((await post("/sign-in/anonymous", {}, "198.51.100.4")).status).toBe(200);
  });

  it("deletes demo accounts after a day, and only demo accounts", async () => {
    const demo = (await (await post("/sign-in/anonymous")).json()) as { user: { id: string } };
    const real = (await (
      await post("/sign-up/email", { name: "R", email: "r@example.test", password: "long enough pw" })
    ).json()) as { user: { id: string } };

    expect(await cleanupDemoAccounts(db)).toBe(0);
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await cleanupDemoAccounts(db, tomorrow)).toBe(1);

    const remaining = (await db.select({ id: users.id }).from(users)).map((u) => u.id);
    expect(remaining).toEqual([real.user.id]);
    // Their data went with them.
    expect((await services.expenses.list(demo.user.id, { limit: 1 })).items).toHaveLength(0);
  });
});

describe("demo data", () => {
  it("is deterministic and never in the future", () => {
    const today = parseIsoDate("2026-10-07");
    const first = generateDemoExpenses(today);
    expect(generateDemoExpenses(today)).toEqual(first);
    expect(first.every((e) => e.spentOn <= today)).toBe(true);
    expect(first.every((e) => e.spentOn >= "2026-08-01")).toBe(true);
  });
});
