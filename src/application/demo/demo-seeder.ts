import { parseIsoDate } from "@/domain/dates";
import { Money } from "@/domain/money";
import type { CurrencyConverter } from "../currency/currency-converter";
import type { CategoryRepository, Clock, ExpenseRepository, NewExpense } from "../ports";
import type { SettingsService } from "../settings/settings-service";
import { generateDemoExpenses } from "./demo-data";

/** Fills a fresh demo account with sample spending. */
export class DemoSeeder {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly converter: CurrencyConverter,
    private readonly clock: Clock,
  ) {}

  async seed(userId: string): Promise<void> {
    const homeCurrency = await this.settings.homeCurrency(userId);
    const categories = await this.categories.list(userId);
    const categoryId = new Map(categories.map((c) => [c.name, c.id]));

    const rows: NewExpense[] = [];
    for (const item of generateDemoExpenses(this.clock.today())) {
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
  }
}
