import { addMonths, firstDayOf, addDays, monthOf, parseIsoDate } from "@/domain/dates";
import { Money } from "@/domain/money";
import type { BudgetService } from "../budgets/budget-service";
import type { CurrencyConverter } from "../currency/currency-converter";
import type { CategoryRepository, Clock, ExpenseRepository, NewExpense } from "../ports";
import type { RecurringService } from "../recurring/recurring-service";
import type { SettingsService } from "../settings/settings-service";
import { DEMO_BUDGETS, DEMO_RECURRING, generateDemoExpenses } from "./demo-data";

/** Fills a fresh demo account with sample spending, recurring payments and budgets. */
export class DemoSeeder {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly converter: CurrencyConverter,
    private readonly recurring: RecurringService,
    private readonly budgets: BudgetService,
    private readonly clock: Clock,
  ) {}

  async seed(userId: string): Promise<void> {
    const homeCurrency = await this.settings.homeCurrency(userId);
    const categories = await this.categories.list(userId);
    const categoryId = new Map(categories.map((c) => [c.name, c.id]));
    const today = this.clock.today();

    const rows: NewExpense[] = [];
    for (const item of generateDemoExpenses(today)) {
      const amount = Money.parse(item.amount, item.currency);
      const spentOn = parseIsoDate(item.spentOn);
      try {
        const { converted, rate } = await this.converter.convert(amount, homeCurrency, spentOn);
        rows.push({
          userId,
          title: item.title,
          note: item.note ?? "",
          categoryId: categoryId.get(item.category) ?? null,
          receiptId: null,
          spentOn,
          amount,
          homeAmount: converted,
          fxRate: rate.rate,
          fxRateDate: rate.publishedOn,
        });
      } catch {
        // If the rate service is unreachable, the demo simply loses its few
        // foreign-currency rows rather than failing to start.
      }
    }
    await this.expenses.createMany(rows);

    // Recurring payments that started two months ago: creating each one logs
    // its history, exactly as it would for a real account.
    const firstMonth = addMonths(monthOf(today), -2);
    for (const payment of DEMO_RECURRING) {
      await this.recurring.create(userId, {
        title: payment.title,
        amount: payment.amount,
        currency: homeCurrency,
        frequency: "monthly",
        startsOn: addDays(firstDayOf(firstMonth), payment.day - 1),
        categoryId: categoryId.get(payment.category) ?? null,
      });
    }

    for (const budget of DEMO_BUDGETS) {
      const id = budget.category === null ? null : (categoryId.get(budget.category) ?? null);
      if (budget.category !== null && !id) continue;
      await this.budgets.set(userId, id, budget.amount);
    }
  }
}
