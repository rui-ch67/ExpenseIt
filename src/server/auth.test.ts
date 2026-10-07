import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { generateDemoExpenses } from "@/application/demo/demo-data";
import { parseIsoDate } from "@/domain/dates";
import type { Database } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema";
import { receipts } from "@/infrastructure/db/schema";
import { createTestDb, FakeExchangeRates, FixedClock, MemoryImageStore, TINY_JPEG } from "@/test/helpers";
import { type Auth, createAuth } from "./auth";
import { createServices, type Services } from "./container";
import { cleanupDemoAccounts } from "./demo-cleanup";

const baseURL = "http://localhost:3000";
/** How the Google callback describes a new user to Better Auth. */
const GOOGLE = { method: "oauth", oauth: { providerId: "google" } } as const;
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
    google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
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

describe("Google sign-in", () => {
  it("sends the visitor to Google", async () => {
    const response = await post("/sign-in/social", { provider: "google", callbackURL: "/home" });
    expect(response.status).toBe(200);
    const { url } = (await response.json()) as { url: string };
    expect(new URL(url).host).toBe("accounts.google.com");
    expect(new URL(url).searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
  });

  it("sets up a new account the first time someone signs in", async () => {
    // What the Google callback does for a new visitor, minus the trip to Google.
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      { name: "Rui", email: "rui@example.test", emailVerified: true },
      GOOGLE,
    );
    expect((await services.settings.get(user.id)).homeCurrency).toBe("GBP");
    expect(await services.categories.list(user.id)).toHaveLength(9);
    expect((await services.expenses.list(user.id, { limit: 1 })).items).toHaveLength(0);
  });

  it("no longer accepts email and password", async () => {
    const response = await post("/sign-up/email", {
      name: "Rui",
      email: "rui@example.test",
      password: "correct horse battery",
    });
    expect(response.status).not.toBe(200);
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
    const real = {
      user: await (await auth.$context).internalAdapter.createUser(
        { name: "R", email: "r@example.test", emailVerified: true },
        GOOGLE,
      ),
    };

    const images = new MemoryImageStore();
    const photo = { bytes: TINY_JPEG, contentType: "image/jpeg" } as const;
    for (const owner of [demo.user.id, real.user.id]) {
      await images.put(`receipts/${owner}/1.jpg`, photo);
      await db.insert(receipts).values({
        userId: owner,
        status: "ready",
        currency: "GBP",
        imagePath: `receipts/${owner}/1.jpg`,
      });
    }

    expect(await cleanupDemoAccounts(db, images)).toBe(0);
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await cleanupDemoAccounts(db, images, tomorrow)).toBe(1);
    // The demo's photo is gone from storage; the real user's is untouched.
    expect([...images.files.keys()]).toEqual([`receipts/${real.user.id}/1.jpg`]);

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
