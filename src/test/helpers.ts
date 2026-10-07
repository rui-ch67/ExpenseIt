/**
 * Test helpers: an in-memory Postgres with the real migrations applied,
 * a fixed clock, and an exchange-rate table that never touches the network.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type {
  Clock,
  ExchangeRateProvider,
  ImageStore,
  ReceiptExtraction,
  ReceiptExtractor,
  ReceiptImage,
} from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { type IsoDate, parseIsoDate } from "@/domain/dates";
import { ServiceUnavailableError } from "@/domain/errors";
import type { ExchangeRate } from "@/domain/exchange-rate";
import type { ExtractedReceipt } from "@/domain/receipt";
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

/** Keeps photos in a Map instead of Vercel Blob. */
export class MemoryImageStore implements ImageStore {
  readonly files = new Map<string, ReceiptImage>();

  async put(path: string, image: ReceiptImage) {
    this.files.set(path, image);
  }

  async get(path: string) {
    const image = this.files.get(path);
    if (!image) return null;
    return { body: new Response(Buffer.from(image.bytes)).body!, contentType: image.contentType };
  }

  async delete(paths: readonly string[]) {
    for (const path of paths) this.files.delete(path);
  }
}

/** Returns queued answers (or errors) in order, instead of calling Gemini. */
export class ScriptedExtractor implements ReceiptExtractor {
  private readonly queue: Array<ExtractedReceipt | Error> = [];
  calls = 0;

  willReturn(...results: Array<ExtractedReceipt | Error>) {
    this.queue.push(...results);
    return this;
  }

  async extract(): Promise<ReceiptExtraction> {
    this.calls += 1;
    const next = this.queue.shift();
    if (!next) throw new Error("ScriptedExtractor has no answer queued");
    if (next instanceof Error) throw next;
    return { receipt: next, model: "scripted", raw: { scripted: true } };
  }
}

/** The smallest valid JPEG header, enough for content sniffing. */
export const TINY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
