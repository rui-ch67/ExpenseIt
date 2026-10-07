/**
 * Test helpers: an in-memory Postgres with the real migrations applied,
 * a fixed clock, and an exchange-rate table that never touches the network.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Clock, ExchangeRateProvider } from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { type IsoDate, parseIsoDate } from "@/domain/dates";
import { ServiceUnavailableError } from "@/domain/errors";
import type { ExchangeRate } from "@/domain/exchange-rate";
import type { Database } from "@/infrastructure/db/client";
import * as schema from "@/infrastructure/db/schema";
import { users } from "@/infrastructure/db/schema";

export async function createTestDb(): Promise<Database> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as Database;
}

export async function createUser(db: Database, id: string, isAnonymous = false) {
  await db.insert(users).values({
    id,
    name: id,
    email: `${id}@example.test`,
    isAnonymous,
  });
  return id;
}

export class FixedClock implements Clock {
  constructor(private date: string) {}

  today(): IsoDate {
    return parseIsoDate(this.date);
  }

  set(date: string) {
    this.date = date;
  }
}

/** Rates keyed "EUR→GBP"; the same rate is returned for any date. */
export class FakeExchangeRates implements ExchangeRateProvider {
  calls = 0;
  available = true;

  constructor(private readonly table: Record<string, string>) {}

  async getRate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate> {
    this.calls += 1;
    if (!this.available) throw new ServiceUnavailableError("rates offline");
    const rate = this.table[`${base}→${quote}`];
    if (!rate) throw new ServiceUnavailableError(`no fake rate for ${base}→${quote}`);
    return { base, quote, rate, publishedOn: on };
  }
}
