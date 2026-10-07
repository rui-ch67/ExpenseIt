import { ValidationError } from "./errors";

/**
 * Currencies ExpenseIt can convert between. The list matches what the
 * exchange-rate source (European Central Bank reference rates) publishes,
 * so every currency here can be converted to every other.
 *
 * `exponent` is the number of minor-unit digits from ISO 4217:
 * GBP 2 (pence), JPY 0 (no minor unit).
 */
export const CURRENCIES = {
  AUD: { name: "Australian Dollar", exponent: 2 },
  BRL: { name: "Brazilian Real", exponent: 2 },
  CAD: { name: "Canadian Dollar", exponent: 2 },
  CHF: { name: "Swiss Franc", exponent: 2 },
  CNY: { name: "Chinese Yuan", exponent: 2 },
  CZK: { name: "Czech Koruna", exponent: 2 },
  DKK: { name: "Danish Krone", exponent: 2 },
  EUR: { name: "Euro", exponent: 2 },
  GBP: { name: "British Pound", exponent: 2 },
  HKD: { name: "Hong Kong Dollar", exponent: 2 },
  HUF: { name: "Hungarian Forint", exponent: 2 },
  IDR: { name: "Indonesian Rupiah", exponent: 2 },
  ILS: { name: "Israeli New Shekel", exponent: 2 },
  INR: { name: "Indian Rupee", exponent: 2 },
  ISK: { name: "Icelandic Króna", exponent: 0 },
  JPY: { name: "Japanese Yen", exponent: 0 },
  KRW: { name: "South Korean Won", exponent: 0 },
  MXN: { name: "Mexican Peso", exponent: 2 },
  MYR: { name: "Malaysian Ringgit", exponent: 2 },
  NOK: { name: "Norwegian Krone", exponent: 2 },
  NZD: { name: "New Zealand Dollar", exponent: 2 },
  PHP: { name: "Philippine Peso", exponent: 2 },
  PLN: { name: "Polish Złoty", exponent: 2 },
  RON: { name: "Romanian Leu", exponent: 2 },
  SEK: { name: "Swedish Krona", exponent: 2 },
  SGD: { name: "Singapore Dollar", exponent: 2 },
  THB: { name: "Thai Baht", exponent: 2 },
  TRY: { name: "Turkish Lira", exponent: 2 },
  USD: { name: "US Dollar", exponent: 2 },
  ZAR: { name: "South African Rand", exponent: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export const DEFAULT_HOME_CURRENCY: CurrencyCode = "GBP";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}

export function parseCurrencyCode(value: string): CurrencyCode {
  const code = value.trim().toUpperCase();
  if (!isCurrencyCode(code)) {
    throw new ValidationError(`Unsupported currency: ${value}`);
  }
  return code;
}

export function exponentOf(currency: CurrencyCode): number {
  return CURRENCIES[currency].exponent;
}
