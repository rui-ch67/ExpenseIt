/**
 * Composition root: the one place that knows which concrete class fills
 * each port. The equivalent of Hilt's AppModule in the Android app, written
 * as a plain function so the wiring is easy to follow and to swap in tests.
 */
import { AccountSetupService } from "@/application/accounts/account-setup-service";
import { BudgetService } from "@/application/budgets/budget-service";
import { CategoryService } from "@/application/categories/category-service";
import { CachingExchangeRateProvider } from "@/application/currency/caching-exchange-rate-provider";
import { CurrencyConverter } from "@/application/currency/currency-converter";
import { DemoSeeder } from "@/application/demo/demo-seeder";
import { ExpenseService } from "@/application/expenses/expense-service";
import { InsightsService } from "@/application/insights/insights-service";
import type { Clock, ExchangeRateProvider, ImageStore, ReceiptExtractor } from "@/application/ports";
import { ReceiptService } from "@/application/receipts/receipt-service";
import { RecurringService } from "@/application/recurring/recurring-service";
import { SettingsService } from "@/application/settings/settings-service";
import type { Database } from "@/infrastructure/db/client";
import { FrankfurterExchangeRateProvider } from "@/infrastructure/fx/frankfurter-exchange-rate-provider";
import { GeminiReceiptExtractor } from "@/infrastructure/ocr/gemini-receipt-extractor";
import { DrizzleBudgetRepository } from "@/infrastructure/repositories/drizzle-budget-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/repositories/drizzle-category-repository";
import { DrizzleExchangeRateStore } from "@/infrastructure/repositories/drizzle-exchange-rate-store";
import { DrizzleExpenseRepository } from "@/infrastructure/repositories/drizzle-expense-repository";
import { DrizzleReceiptRepository } from "@/infrastructure/repositories/drizzle-receipt-repository";
import { DrizzleRecurringRuleRepository } from "@/infrastructure/repositories/drizzle-recurring-rule-repository";
import { DrizzleSettingsRepository } from "@/infrastructure/repositories/drizzle-settings-repository";
import { DrizzleUsageLimiter } from "@/infrastructure/repositories/drizzle-usage-limiter";
import { VercelBlobImageStore } from "@/infrastructure/storage/vercel-blob-image-store";
import { SystemClock } from "@/infrastructure/system-clock";

export interface Services {
  readonly categories: CategoryService;
  readonly expenses: ExpenseService;
  readonly settings: SettingsService;
  readonly insights: InsightsService;
  readonly receipts: ReceiptService;
  readonly budgets: BudgetService;
  readonly recurring: RecurringService;
  readonly accountSetup: AccountSetupService;
}

export interface ContainerOverrides {
  /** Replaces the live rate API (tests use a fixed table of rates). */
  readonly exchangeRates?: ExchangeRateProvider;
  readonly clock?: Clock;
  /** Replaces Gemini (tests use a scripted extractor). */
  readonly receiptExtractor?: ReceiptExtractor;
  /** Replaces Vercel Blob (tests keep photos in memory). */
  readonly imageStore?: ImageStore;
}

export function createServices(db: Database, overrides: ContainerOverrides = {}): Services {
  const clock = overrides.clock ?? new SystemClock();

  const categoryRepo = new DrizzleCategoryRepository(db);
  const expenseRepo = new DrizzleExpenseRepository(db);
  const receiptRepo = new DrizzleReceiptRepository(db);
  const settingsRepo = new DrizzleSettingsRepository(db);
  const budgetRepo = new DrizzleBudgetRepository(db);

  const rates = new CachingExchangeRateProvider(
    overrides.exchangeRates ?? new FrankfurterExchangeRateProvider(clock),
    new DrizzleExchangeRateStore(db),
  );
  const converter = new CurrencyConverter(rates);

  const settings = new SettingsService(settingsRepo, expenseRepo, budgetRepo, converter, clock);
  const categories = new CategoryService(categoryRepo);
  const expenses = new ExpenseService(expenseRepo, categoryRepo, receiptRepo, settings, converter);
  const insights = new InsightsService(expenseRepo, categoryRepo, settings, clock);
  const receipts = new ReceiptService(
    receiptRepo,
    expenses,
    categoryRepo,
    settings,
    overrides.receiptExtractor ?? GeminiReceiptExtractor.fromEnv(),
    overrides.imageStore ?? new VercelBlobImageStore(),
    new DrizzleUsageLimiter(db),
    clock,
  );
  const budgets = new BudgetService(budgetRepo, expenseRepo, categoryRepo, settings, clock);
  const recurring = new RecurringService(
    new DrizzleRecurringRuleRepository(db),
    expenses,
    expenseRepo,
    categoryRepo,
    settings,
    converter,
    clock,
  );
  const demo = new DemoSeeder(expenseRepo, categoryRepo, settings, converter, recurring, budgets, clock);
  const accountSetup = new AccountSetupService(settings, categories, demo);

  return { categories, expenses, settings, insights, receipts, budgets, recurring, accountSetup };
}
