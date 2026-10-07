import type { CurrencyCode } from "@/domain/currency";
import type { IsoDate } from "@/domain/dates";
import type { ExchangeRate } from "@/domain/exchange-rate";
import type { ExchangeRateProvider, ExchangeRateStore } from "../ports";

/**
 * Wraps any ExchangeRateProvider with a persistent cache (the Decorator
 * pattern). Historical rates never change, so each (pair, day) only has to
 * be fetched once, and the free rate API is spared repeat calls. New
 * behaviour is added without editing the provider itself (Open/Closed).
 */
export class CachingExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly inner: ExchangeRateProvider,
    private readonly store: ExchangeRateStore,
  ) {}

  async getRate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Promise<ExchangeRate> {
    const cached = await this.store.find(base, quote, on);
    if (cached) return cached;

    const rate = await this.inner.getRate(base, quote, on);
    await this.store.save(on, rate);
    return rate;
  }
}
