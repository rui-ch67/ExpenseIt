import { Play } from "lucide-react";
import Link from "next/link";
import { addMonths, parseYearMonth, todayIn, type YearMonth } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { cn } from "@/ui/cn";
import { formatDay, formatMonth, ordinal } from "@/ui/format";
import { inkFor } from "@/ui/inks";
import { MonthSwitcher } from "@/ui/month-switcher";
import { PackagingStripe } from "@/ui/packaging-stripe";

export const metadata = { title: "Insights" };

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const user = await requireUser();
  const { insights } = getServices();
  const current = insights.currentMonth();
  const requested = (await searchParams).month;
  let month: YearMonth = current;
  try {
    if (typeof requested === "string") month = parseYearMonth(requested) > current ? current : parseYearMonth(requested);
  } catch {
    month = current;
  }
  const isCurrent = month === current;
  const recapMonth = isCurrent ? addMonths(month, -1) : month;
  const today = todayIn();

  const { budgets, recurring } = getServices();
  const [summary, trend, recapSummary, budgetOverview, perMonth, rules] = await Promise.all([
    insights.monthSummary(user.id, month),
    insights.monthlyTrend(user.id, 6, month),
    insights.monthSummary(user.id, recapMonth),
    budgets.overview(user.id),
    recurring.monthlyCost(user.id),
    recurring.list(user.id),
  ]);
  const watched = [
    ...(budgetOverview.overall ? [budgetOverview.overall] : []),
    ...budgetOverview.categories,
  ];
  const overCount = watched.filter((b) => b.state === "over").length;
  const nearCount = watched.filter((b) => b.state === "near").length;
  const activeRules = rules.filter((r) => !r.paused && r.nextDueOn).length;
  const monthName = formatMonth(month, "short");
  const comparison = isCurrent ? summary.previousToDate : summary.previousTotal;
  const diff = comparison && !comparison.isZero() ? summary.total.subtract(comparison) : null;
  const maxDay = Math.max(...summary.byDay.map((d) => d.total.minor), 1);
  const maxMonth = Math.max(...trend.map((t) => t.total.minor), 1);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-6 lg:pt-10">
        <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Insights</h1>
        <MonthSwitcher month={month} current={current} basePath="/insights" />
      </header>

      <section aria-labelledby="month-heading" className="grid gap-4 border-y-2 border-ink py-6">
        <h2 id="month-heading" className="max-w-3xl text-[clamp(1.75rem,6vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
          {summary.total.format()} {isCurrent ? `in ${monthName} so far` : `in ${formatMonth(month)}`}
          {diff && (
            <span className="text-muted">
              , {diff.abs().format()} {diff.isNegative() ? "less" : "more"} than{" "}
              {formatMonth(addMonths(month, -1), "short")}
              {isCurrent ? ` by the ${ordinal(Number(today.slice(8, 10)))}` : ""}.
            </span>
          )}
        </h2>
        <p className="text-muted">
          {summary.count} {summary.count === 1 ? "purchase" : "purchases"} · about {summary.dailyAverage.format()} a day
        </p>
        <PackagingStripe
          className="h-5"
          segments={summary.byCategory.map((c) => ({
            color: c.category?.color ?? null,
            share: c.share,
            label: c.category?.name ?? "Uncategorised",
          }))}
        />
      </section>

      {!recapSummary.total.isZero() && (
        <Link
          href={`/recap/${recapMonth}`}
          data-surface="dark"
          className="mt-6 flex items-center justify-between gap-4 bg-ink p-5 text-white no-underline hover:bg-[#2a2a2a]"
        >
          <span>
            <span className="block text-2xl font-extrabold tracking-tight">Your {formatMonth(recapMonth, "short")}, wrapped</span>
            <span className="text-sm text-white/80">The month in {recapSummary.count} purchases, as a story you can share.</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center bg-cat-lime text-ink">
            <Play aria-hidden className="size-5 fill-current" />
          </span>
        </Link>
      )}

      <nav aria-label="Planning" className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link href="/budgets" className="grid gap-1 border-2 border-ink p-4 no-underline hover:bg-wash">
          <span className="text-xl font-extrabold">Budgets</span>
          <span className="text-sm text-muted">
            {watched.length === 0
              ? "Set a monthly limit and get a warning before you go over."
              : overCount > 0
                ? `${overCount} over budget this month${nearCount ? `, ${nearCount} nearly there` : ""}.`
                : nearCount > 0
                  ? `${nearCount} nearly at the limit this month.`
                  : `All ${watched.length} within budget this month.`}
          </span>
        </Link>
        <Link href="/recurring" className="grid gap-1 border-2 border-ink p-4 no-underline hover:bg-wash">
          <span className="text-xl font-extrabold">Recurring</span>
          <span className="text-sm text-muted">
            {activeRules === 0
              ? "Rent, bills and subscriptions, logged automatically."
              : `${activeRules} active, about ${perMonth.format()} a month.`}
          </span>
        </Link>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="where-heading">
          <h2 id="where-heading" className="pb-4 text-2xl font-extrabold tracking-tight">
            Where it went
          </h2>
          {summary.byCategory.length === 0 ? (
            <p className="text-muted">Nothing spent {isCurrent ? "yet this month" : "this month"}.</p>
          ) : (
            <ol className="grid gap-4">
              {summary.byCategory.map((spend) => {
                const ink = inkFor(spend.category?.color ?? null);
                return (
                  <li key={spend.category?.id ?? "none"}>
                    <Link
                      href={`/activity?category=${spend.category?.id ?? "none"}&month=${month}`}
                      className="group grid gap-1.5 no-underline"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-extrabold lowercase group-hover:underline">
                          {spend.category?.name ?? "uncategorised"}
                        </span>
                        <span className="text-sm text-muted">
                          {spend.count} · {Math.round(spend.share * 100)}%{" "}
                          <strong className="ml-1 text-base text-ink">{spend.total.format()}</strong>
                        </span>
                      </span>
                      <span className="block h-4 bg-wash ring-2 ring-ink">
                        <span className={cn("block h-full", ink.bg)} style={{ width: `${Math.max(spend.share * 100, 1)}%` }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="grid content-start gap-12">
          <section aria-labelledby="days-heading">
            <h2 id="days-heading" className="pb-4 text-2xl font-extrabold tracking-tight">
              Day by day
            </h2>
            <div
              role="img"
              aria-label={`Daily spending in ${formatMonth(month)}. Highest: ${
                summary.byDay.reduce((a, b) => (b.total.minor > a.total.minor ? b : a)).total.format()
              }.`}
              className="flex h-36 items-end gap-[3px] border-b-2 border-ink"
            >
              {summary.byDay.map((d) => (
                <span
                  key={d.day}
                  title={`${formatDay(d.day, today)}: ${d.total.format()}`}
                  className={cn("flex-1", d.day > today ? "bg-transparent" : d.total.isZero() ? "bg-rule" : "bg-ink")}
                  style={{ height: d.total.isZero() ? "2px" : `${Math.max((d.total.minor / maxDay) * 100, 3)}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted">
              <span>1st</span>
              <span>{ordinal(summary.byDay.length)}</span>
            </div>
          </section>

          <section aria-labelledby="trend-heading">
            <h2 id="trend-heading" className="pb-4 text-2xl font-extrabold tracking-tight">
              Last six months
            </h2>
            <ol className="grid grid-cols-6 items-end gap-2">
              {trend.map((t) => (
                <li key={t.month} className="grid gap-1.5 text-center">
                  <span className="text-[11px] font-bold">{t.total.isZero() ? "–" : t.total.format().replace(/\.\d+$/, "")}</span>
                  <span className="flex h-28 items-end">
                    <span
                      className={cn("block w-full ring-2 ring-ink", t.month === month ? "bg-cat-lime" : "bg-paper")}
                      style={{ height: `${Math.max((t.total.minor / maxMonth) * 100, 2)}%` }}
                    />
                  </span>
                  <Link href={`/insights?month=${t.month}`} className="text-xs font-bold no-underline hover:underline">
                    {formatMonth(t.month, "short").slice(0, 3)}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
