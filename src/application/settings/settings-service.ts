import { type CurrencyCode, DEFAULT_HOME_CURRENCY, parseCurrencyCode } from "@/domain/currency";
import type { CurrencyConverter } from "../currency/currency-converter";
import type {
  BudgetRepository,
  Clock,
  ExpenseRepository,
  HomeAmountUpdate,
  SettingsRepository,
  UserSettings,
} from "../ports";

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly expenses: ExpenseRepository,
    private readonly budgets: BudgetRepository,
    private readonly converter: CurrencyConverter,
    private readonly clock: Clock,
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

    const staleBudgets = (await this.budgets.list(userId)).some((b) => b.amount.currency !== homeCurrency);
    if (current.homeCurrency === homeCurrency && pending.length === 0 && !staleBudgets) {
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

    // Budgets are limits for the future, so they convert at today's rate.
    const budgetUpdates = [];
    for (const budget of await this.budgets.list(userId)) {
      if (budget.amount.currency === homeCurrency) continue;
      const { converted } = await this.converter.convert(budget.amount, homeCurrency, this.clock.today());
      budgetUpdates.push({ id: budget.id, amount: converted });
    }

    await this.expenses.updateHomeAmounts(userId, updates);
    await this.budgets.updateAmounts(userId, budgetUpdates);
    const next = { userId, homeCurrency };
    await this.settings.save(next);
    return next;
  }
}
