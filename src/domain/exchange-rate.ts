import { type CurrencyCode, exponentOf } from "./currency";
import { ValidationError } from "./errors";
import type { IsoDate } from "./dates";
import { Money } from "./money";

/**
 * How many units of `quote` one unit of `base` buys on `publishedOn`.
 * The rate is kept as a decimal string ("0.18546") so it round-trips
 * through the database without picking up floating-point noise.
 */
export interface ExchangeRate {
  readonly base: CurrencyCode;
  readonly quote: CurrencyCode;
  readonly rate: string;
  /** The day the rate was published (weekends use Friday's rate). */
  readonly publishedOn: IsoDate;
}

const RATE_PATTERN = /^\d+(?:\.\d+)?$/;

export function identityRate(currency: CurrencyCode, on: IsoDate): ExchangeRate {
  return { base: currency, quote: currency, rate: "1", publishedOn: on };
}

/**
 * Converts `amount` into the rate's quote currency, rounding half away from
 * zero to the nearest minor unit. Uses BigInt so the multiplication is exact
 * before the single rounding step.
 */
export function convert(amount: Money, rate: ExchangeRate): Money {
  if (amount.currency !== rate.base) {
    throw new ValidationError(
      `Rate is for ${rate.base}, but the amount is in ${amount.currency}`,
    );
  }
  if (!RATE_PATTERN.test(rate.rate)) {
    throw new ValidationError(`Invalid exchange rate "${rate.rate}"`);
  }
  if (rate.base === rate.quote) return amount;

  const [whole, fraction = ""] = rate.rate.split(".");
  const rateScaled = BigInt(whole + fraction);
  const rateScale = 10n ** BigInt(fraction.length);
  const fromScale = 10n ** BigInt(exponentOf(rate.base));
  const toScale = 10n ** BigInt(exponentOf(rate.quote));

  const numerator = BigInt(Math.abs(amount.minor)) * rateScaled * toScale;
  const denominator = rateScale * fromScale;
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);

  const minor = Number(rounded);
  return Money.ofMinor(amount.isNegative() ? -minor : minor, rate.quote);
}
