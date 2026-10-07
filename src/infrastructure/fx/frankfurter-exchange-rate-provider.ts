import { z } from "zod";
import type { Clock, ExchangeRateProvider } from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { type IsoDate, parseIsoDate } from "@/domain/dates";
import { ServiceUnavailableError } from "@/domain/errors";
import type { ExchangeRate } from "@/domain/exchange-rate";

const responseSchema = z.object({
  date: z.string(),
  rates: z.record(z.string(), z.number().positive()),
});

/**
 * Exchange rates from Frankfurter (https://frankfurter.dev): free, no API
 * key, European Central Bank reference rates, published each working day.
 * Asking for a weekend or holiday returns the last working day's rate.
 */
export class FrankfurterExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly clock: Clock,
    private readonly baseUrl = "https://api.frankfurter.dev/v1",
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getRate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate> {
    // Rates for future dates don't exist yet; use the latest available.
    const day = on > this.clock.today() ? "latest" : on;
    const url = `${this.baseUrl}/${day}?base=${base}&symbols=${quote}`;

    let response: Response;
    try {
      response = await this.fetchFn(url, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw new ServiceUnavailableError("Couldn't reach the exchange-rate service");
    }
    if (!response.ok) {
      throw new ServiceUnavailableError(
        `Exchange-rate service answered ${response.status} for ${base}→${quote} on ${day}`,
      );
    }

    const body = responseSchema.parse(await response.json());
    const rate = body.rates[quote];
    if (rate === undefined) {
      throw new ServiceUnavailableError(`No ${base}→${quote} rate published for ${day}`);
    }
    return {
      base,
      quote,
      // Rates arrive as JSON numbers with up to 5 significant figures, so
      // toString() keeps exactly what was sent, except that very small rates
      // print in exponent form ("1e-7"), which toFixed avoids.
      rate: rate.toString().includes("e") ? rate.toFixed(10) : rate.toString(),
      publishedOn: parseIsoDate(body.date),
    };
  }
}
