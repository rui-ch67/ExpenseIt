import { Repeat } from "lucide-react";
import Link from "next/link";
import type { BudgetStatus } from "@/domain/budget";
import type { Category } from "@/domain/category";
import { daysInMonth, todayIn } from "@/domain/dates";
import { Money } from "@/domain/money";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { BackLink } from "@/ui/back-link";
import { AddBudget, BudgetBar, BudgetRow, type BudgetRowView, EditBudget, StateLine } from "@/ui/budgets";
import { formatMonth, ordinal } from "@/ui/format";

export const metadata = { title: "Budgets" };

function toRow(status: BudgetStatus, category: Category | null): BudgetRowView {
  return {
    id: status.budget.id,
    categoryId: category?.id ?? null,
    name: category?.name ?? "All spending",
    color: category?.color ?? null,
    amount: status.budget.amount.toDecimalString(),
    amountText: status.budget.amount.format(),
    spentText: status.spent.format(),
    remainingText: status.remaining.abs().format(),
    state: status.state,
    ratio: status.ratio,
  };
}

export default async function BudgetsPage() {
  const user = await requireUser();
  const { budgets, settings, recurring } = getServices();
  const [overview, currency] = await Promise.all([budgets.overview(user.id), settings.homeCurrency(user.id)]);
  const today = todayIn();
  const day = Number(today.slice(8, 10));
  const days = daysInMonth(overview.month);
  const overall = overview.overall ? toRow(overview.overall, null) : null;
  const pace = overview.overall ? await recurring.projectMonth(user.id, overview.overall.spent) : null;
  const symbol = Money.zero(currency).format().replace(/[\d.,\s]/g, "");

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 lg:px-8">
      <BackLink href="/insights">Insights</BackLink>
      <header className="flex flex-wrap items-end justify-between gap-3 pb-6">
        <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Budgets</h1>
        <p className="text-sm font-bold text-muted">
          {formatMonth(overview.month)} · {ordinal(day)} of {days}
        </p>
      </header>

      {overall && overview.overall && (
        <section aria-labelledby="overall-heading" className="grid gap-3 border-y-2 border-ink py-6">
          <h2 id="overall-heading" className="text-[clamp(1.75rem,6vw,2.5rem)] text-balance leading-[1.02] font-extrabold tracking-[-0.03em]">
            {overall.spentText} of {overall.amountText}
            <span className="text-muted"> spent this month.</span>
          </h2>
          <BudgetBar ratio={overall.ratio} color="ink" state={overall.state} thick />
          <p className="flex flex-wrap justify-between gap-x-4">
            <StateLine row={overall} />
            {pace && day < days && (
              <span className="text-muted">
                Heading for about {pace.format()} by the {ordinal(days)}, counting regular payments still due.
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <EditBudget row={overall} />
          </div>
        </section>
      )}

      <section aria-labelledby="categories-heading" className="mt-8">
        <h2 id="categories-heading" className="text-xl font-extrabold">
          By category
        </h2>
        {overview.categories.length === 0 ? (
          <p className="mt-2 text-muted">No category budgets yet. Add one below to get a warning before you overspend.</p>
        ) : (
          <ul className="mt-1">
            {overview.categories.map((status) => (
              <BudgetRow key={status.budget.id} row={toRow(status, status.category)} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <AddBudget
          options={overview.unbudgeted.map((c) => ({ id: c.id, name: c.name }))}
          currencySymbol={symbol}
          overallMissing={!overview.overall}
        />
      </div>

      <p className="mt-8 text-sm text-muted">
        Regular payments like rent count towards your budgets as they&rsquo;re logged.{" "}
        <Link href="/recurring" className="inline-flex items-center gap-1 font-bold text-ink">
          <Repeat aria-hidden className="size-3.5" strokeWidth={2.5} />
          Manage recurring payments
        </Link>
      </p>
    </main>
  );
}
