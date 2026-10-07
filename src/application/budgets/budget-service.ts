import { assertBudgetAmount, type Budget, type BudgetStatus, budgetStatus, byUrgency } from "@/domain/budget";
import type { Category } from "@/domain/category";
import { firstDayOf, lastDayOf, monthOf, type YearMonth } from "@/domain/dates";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { Money } from "@/domain/money";
import type { BudgetRepository, CategoryRepository, Clock, ExpenseRepository } from "../ports";
import type { SettingsService } from "../settings/settings-service";

export interface CategoryBudgetStatus extends BudgetStatus {
  readonly category: Category;
}

export interface BudgetOverview {
  readonly month: YearMonth;
  /** The overall monthly budget, if one is set. */
  readonly overall: BudgetStatus | null;
  /** Category budgets, most urgent first. */
  readonly categories: CategoryBudgetStatus[];
  /** Categories with no budget yet, for the "add a budget" picker. */
  readonly unbudgeted: Category[];
}

export class BudgetService {
  constructor(
    private readonly budgets: BudgetRepository,
    private readonly expenses: ExpenseRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsService,
    private readonly clock: Clock,
  ) {}

  async overview(userId: string, month: YearMonth = monthOf(this.clock.today())): Promise<BudgetOverview> {
    const currency = await this.settings.homeCurrency(userId);
    const [budgets, categoryList, byCategory] = await Promise.all([
      this.budgets.list(userId),
      this.categories.list(userId),
      this.expenses.totalsByCategory(userId, currency, firstDayOf(month), lastDayOf(month)),
    ]);
    const spentIn = (categoryId: string | null) =>
      Money.ofMinor(byCategory.find((t) => t.categoryId === categoryId)?.homeMinor ?? 0, currency);
    const total = Money.ofMinor(
      byCategory.reduce((sum, t) => sum + t.homeMinor, 0),
      currency,
    );
    const categoryById = new Map(categoryList.map((c) => [c.id, c]));

    const overallBudget = budgets.find((b) => b.categoryId === null);
    const categoryStatuses = budgets
      .flatMap((b): CategoryBudgetStatus[] => {
        const category = b.categoryId ? categoryById.get(b.categoryId) : undefined;
        return category ? [{ ...budgetStatus(inCurrency(b, currency), spentIn(category.id)), category }] : [];
      })
      .sort(byUrgency);
    const budgeted = new Set(budgets.map((b) => b.categoryId));

    return {
      month,
      overall: overallBudget ? budgetStatus(inCurrency(overallBudget, currency), total) : null,
      categories: categoryStatuses,
      unbudgeted: categoryList.filter((c) => !budgeted.has(c.id)),
    };
  }

  /** The budget most worth a warning this month (near or over), if any. */
  async mostUrgent(userId: string): Promise<(BudgetStatus & { category: Category | null }) | null> {
    const { overall, categories } = await this.overview(userId);
    const candidates = [
      ...categories,
      ...(overall ? [{ ...overall, category: null }] : []),
    ].filter((s) => s.state !== "under");
    return candidates.sort(byUrgency)[0] ?? null;
  }

  async set(userId: string, categoryId: string | null, amount: string): Promise<Budget> {
    const currency = await this.settings.homeCurrency(userId);
    const money = Money.parse(amount, currency);
    assertBudgetAmount(money);
    if (categoryId && !(await this.categories.findById(userId, categoryId))) {
      throw new ValidationError("That category doesn't exist");
    }
    return this.budgets.upsert(userId, categoryId, money);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.budgets.delete(userId, id))) throw new NotFoundError("Budget");
  }
}

/**
 * Budgets are converted when the home currency changes; this guards the
 * moment in between, so a status never compares two currencies.
 */
function inCurrency(budget: Budget, currency: Money["currency"]): Budget {
  return budget.amount.currency === currency
    ? budget
    : { ...budget, amount: Money.ofMinor(0, currency) };
}
