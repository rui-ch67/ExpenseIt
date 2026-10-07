import { type CurrencyCode, DEFAULT_HOME_CURRENCY, parseCurrencyCode } from "@/domain/currency";
import type { CurrencyConverter } from "../currency/currency-converter";
import type {
  ExpenseRepository,
  HomeAmountUpdate,
  SettingsRepository,
  UserSettings,
} from "../ports";

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly expenses: ExpenseRepository,
    private readonly converter: CurrencyConverter,
  ) {}

  async get(userId: string): Promise<UserSettings> {
    return (
      (await this.settings.get(userId)) ?? { userId, homeCurrency: DEFAULT_HOME_CURRENCY }
    );
  }

  async homeCurrency(userId: string): Promise<CurrencyCode> {
    return (await this.get(userId)).homeCurrency;
  }

  async initialise(userId: string, homeCurrency: CurrencyCode = DEFAULT_HOME_CURRENCY) {
    if (await this.settings.get(userId)) return;
    await this.settings.save({ userId, homeCurrency });
  }

  /**
   * Switches the home currency and re-converts every expense at the rate
   * from the day it was spent, so past months keep their true value.
   *
   * All rates are fetched before anything is written: if the rate service
   * is down, nothing changes. Expenses are updated before the setting, and
   * the update only touches rows not yet converted, so retrying after a
   * failure picks up where it stopped.
   */
  async changeHomeCurrency(userId: string, currency: string): Promise<UserSettings> {
    const homeCurrency = parseCurrencyCode(currency);
    const current = await this.get(userId);
    const pending = await this.expenses.listNotInHomeCurrency(userId, homeCurrency);

    if (current.homeCurrency === homeCurrency && pending.length === 0) {
      return current;
    }

    const updates: HomeAmountUpdate[] = [];
    for (const expense of pending) {
      const { converted, rate } = await this.converter.convert(
        expense.amount,
        homeCurrency,
        expense.spentOn,
      );
      updates.push({
        id: expense.id,
        homeAmount: converted,
        fxRate: rate.rate,
        fxRateDate: rate.publishedOn,
      });
    }

    await this.expenses.updateHomeAmounts(userId, updates);
    const next = { userId, homeCurrency };
    await this.settings.save(next);
    return next;
  }
}
