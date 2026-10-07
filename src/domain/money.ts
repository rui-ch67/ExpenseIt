import { type CurrencyCode, exponentOf } from "./currency";
import { ValidationError } from "./errors";

/**
 * An exact amount of money, stored as an integer number of minor units
 * (pence, cents, yen) together with its currency.
 *
 * Floating point is never used for amounts: 0.1 + 0.2 !== 0.3 in binary
 * floating point, which is how totals drift by a penny. The Android version
 * used BigDecimal for the same reason; integers in minor units are the
 * equivalent here and map directly onto a Postgres `bigint` column.
 */
export class Money {
  private constructor(
    readonly minor: number,
    readonly currency: CurrencyCode,
  ) {}

  static ofMinor(minor: number, currency: CurrencyCode): Money {
    if (!Number.isSafeInteger(minor)) {
      throw new ValidationError(`Amount must be a whole number of minor units, got ${minor}`);
    }
    // Normalise -0 so equality checks and formatting never see it.
    return new Money(minor === 0 ? 0 : minor, currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0, currency);
  }

  /**
   * Parses a user-typed amount such as "12.5", "1,299.99" or "£4.20".
   * Rejects more decimal places than the currency allows rather than
   * silently rounding what the user typed.
   */
  static parse(input: string, currency: CurrencyCode): Money {
    const cleaned = input.replace(/[\s,]/g, "").replace(/^[^\d.-]+/, "");
    const match = /^(-)?(\d+)(?:\.(\d*))?$/.exec(cleaned);
    if (!match) {
      throw new ValidationError(`"${input}" is not a valid amount`);
    }
    const [, sign, whole, fraction = ""] = match;
    const exponent = exponentOf(currency);
    if (fraction.length > exponent) {
      throw new ValidationError(
        exponent === 0
          ? `${currency} amounts can't have decimals`
          : `${currency} amounts can have at most ${exponent} decimal places`,
      );
    }
    const minor = Number(whole + fraction.padEnd(exponent, "0"));
    return Money.ofMinor(sign ? -minor : minor, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinor(this.minor + other.minor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinor(this.minor - other.minor, this.currency);
  }

  abs(): Money {
    return Money.ofMinor(Math.abs(this.minor), this.currency);
  }

  isZero(): boolean {
    return this.minor === 0;
  }

  isNegative(): boolean {
    return this.minor < 0;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  /**
   * Splits this amount in proportion to `weights` so the parts always add
   * back up to exactly this amount. Leftover minor units from rounding go
   * to the parts with the largest remainders (the "largest remainder"
   * method), so a 10p discount split three ways becomes 4p + 3p + 3p.
   */
  allocate(weights: readonly number[]): Money[] {
    if (weights.length === 0) {
      throw new ValidationError("Cannot allocate across zero parts");
    }
    if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
      throw new ValidationError("Allocation weights must be whole numbers, zero or above");
    }
    // With nothing to weigh by, share equally.
    const allZero = weights.every((w) => w === 0);
    const effective = (allZero ? weights.map(() => 1) : weights).map(BigInt);
    const weightSum = effective.reduce((sum, w) => sum + w, 0n);

    // BigInt keeps amount × weight exact however large either gets.
    const amount = BigInt(Math.abs(this.minor));
    const shares = effective.map((w, index) => ({
      index,
      share: (amount * w) / weightSum,
      remainder: (amount * w) % weightSum,
    }));

    let leftover = amount - shares.reduce((sum, s) => sum + s.share, 0n);
    const byRemainder = [...shares].sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    );
    for (const s of byRemainder) {
      if (leftover === 0n) break;
      s.share += 1n;
      leftover -= 1n;
    }
    const sign = this.minor < 0 ? -1 : 1;
    return shares.map((s) => Money.ofMinor(sign * Number(s.share), this.currency));
  }

  /** "1234" minor GBP → "12.34"; "500" minor JPY → "500". */
  toDecimalString(): string {
    const exponent = exponentOf(this.currency);
    const digits = Math.abs(this.minor).toString().padStart(exponent + 1, "0");
    const whole = exponent === 0 ? digits : digits.slice(0, -exponent);
    const fraction = exponent === 0 ? "" : `.${digits.slice(-exponent)}`;
    return `${this.minor < 0 ? "-" : ""}${whole}${fraction}`;
  }

  format(locale = "en-GB"): string {
    const exponent = exponentOf(this.currency);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(Number(this.toDecimalString()));
  }

  toJSON(): { minor: number; currency: CurrencyCode } {
    return { minor: this.minor, currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new ValidationError(
        `Cannot combine ${this.currency} and ${other.currency} without converting first`,
      );
    }
  }
}

export function sum(amounts: readonly Money[], currency: CurrencyCode): Money {
  return amounts.reduce((total, m) => total.add(m), Money.zero(currency));
}
