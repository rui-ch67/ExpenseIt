import type { CurrencyCode } from "@/domain/currency";
import type { IsoDate } from "@/domain/dates";
import { convert, type ExchangeRate, identityRate } from "@/domain/exchange-rate";
import type { Money } from "@/domain/money";
import type { ExchangeRateProvider } from "../ports";

export interface Conversion {
  readonly converted: Money;
  readonly rate: ExchangeRate;
}

/** Converts money between currencies using the rate published on a given day. */
export class CurrencyConverter {
  constructor(private readonly rates: ExchangeRateProvider) {}

  async convert(amount: Money, to: CurrencyCode, on: IsoDate): Promise<Conversion> {
    if (amount.currency === to) {
      return { converted: amount, rate: identityRate(to, on) };
    }
    const rate = await this.rates.getRate(amount.currency, to, on);
    return { converted: convert(amount, rate), rate };
  }
}
