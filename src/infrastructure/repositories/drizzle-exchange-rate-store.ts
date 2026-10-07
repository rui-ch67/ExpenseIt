import { and, eq } from "drizzle-orm";
import type { ExchangeRateStore } from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { type IsoDate, parseIsoDate } from "@/domain/dates";
import type { ExchangeRate } from "@/domain/exchange-rate";
import type { Database } from "../db/client";
import { exchangeRates } from "../db/schema";
import { trimDecimal } from "./mappers";

export class DrizzleExchangeRateStore implements ExchangeRateStore {
  constructor(private readonly db: Database) {}

  async find(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate | null> {
    const [row] = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.base, base),
          eq(exchangeRates.quote, quote),
          eq(exchangeRates.requestedOn, on),
        ),
      );
    return row
      ? { base, quote, rate: trimDecimal(row.rate), publishedOn: parseIsoDate(row.publishedOn) }
      : null;
  }

  async save(requestedOn: IsoDate, rate: ExchangeRate): Promise<void> {
    await this.db
      .insert(exchangeRates)
      .values({
        base: rate.base,
        quote: rate.quote,
        requestedOn,
        rate: rate.rate,
        publishedOn: rate.publishedOn,
      })
      .onConflictDoNothing();
  }
}
