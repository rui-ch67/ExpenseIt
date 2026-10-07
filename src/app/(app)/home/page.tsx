import { Camera, PenLine } from "lucide-react";
import Link from "next/link";
import type { MonthSummary } from "@/application/insights/insights-service";
import type { Upcoming } from "@/application/recurring/recurring-service";
import type { BudgetStatus } from "@/domain/budget";
import type { Category } from "@/domain/category";
import {
  addMonths,
  firstDayOf,
  type IsoDate,
  lastDayOf,
  parseYearMonth,
  todayIn,
  type YearMonth,
} from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { categoryMap, toExpenseView } from "@/server/views";
import { ButtonLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { CountUp } from "@/ui/count-up";
import { ExpenseDays } from "@/ui/expense-list";
import { formatDay, formatMonth, ordinal } from "@/ui/format";
import { inkFor } from "@/ui/inks";
import { MonthSwitcher } from "@/ui/month-switcher";
import { PackagingStripe } from "@/ui/packaging-stripe";
import { StoryCard, StoryRail } from "@/ui/story-cards";
import { Wordmark } from "@/ui/brand-mark";

export const metadata = { title: "Home" };

function pickMonth(value: string | string[] | undefined, current: YearMonth): YearMonth {
  if (typeof value !== "string") return current;
  try {
    const month = parseYearMonth(value);
    return month > current ? current : month;
  } catch {
    return current;
  }
}

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const { insights, expenses, categories } = getServices();
  const current = insights.currentMonth();
  const month = pickMonth((await searchParams).month, current);
  const isCurrent = month === current;

  const { budgets, recurring } = getServices();
  const [summary, recent, categoryList, previousRecap, urgent, upcoming] = await Promise.all([
    insights.monthSummary(user.id, month),
    expenses.list(user.id, { limit: 12, from: firstDayOf(month), to: lastDayOf(month) }),
    categories.list(user.id),
    isCurrent ? insights.monthSummary(user.id, addMonths(month, -1)) : Promise.resolve(null),
    isCurrent ? budgets.mostUrgent(user.id) : Promise.resolve(null),
    isCurrent ? recurring.upcoming(user.id, 7) : Promise.resolve([]),
  ]);
  const byId = categoryMap(categoryList);
  const recentViews = recent.items.map((e) => toExpenseView(e, byId));
  const today = todayIn();

  return (
    <main className="mx-auto max-w-5xl lg:px-8 lg:py-8">
      <MonthBlock summary={summary} month={month} current={current} isCurrent={isCurrent} />

      <Stories
        summary={summary}
        isCurrent={isCurrent}
        previous={previousRecap}
        today={today}
        nextPayment={upcoming[0] ? { ...upcoming[0], category: categoryList.find((c) => c.id === upcoming[0].rule.categoryId) ?? null } : null}
      />

      {urgent && <BudgetAlert status={urgent} />}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="grid gap-6">
          <div className="grid grid-cols-[1fr_auto] gap-2 px-4 lg:grid-cols-2 lg:px-0">
            <ButtonLink href="/scan">
              <Camera aria-hidden className="size-5" strokeWidth={2.5} />
              Scan a receipt
            </ButtonLink>
            <ButtonLink href="/expenses/new" variant="secondary" className="whitespace-nowrap">
              <PenLine aria-hidden className="size-5" strokeWidth={2.5} />
              Add by hand
            </ButtonLink>
          </div>

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="flex items-baseline justify-between px-4 pb-3 text-xl font-extrabold lg:px-0">
              {isCurrent ? "Latest spending" : `Spending in ${formatMonth(month, "short")}`}
              {recent.nextCursor && (
                <Link href="/activity" className="text-sm font-bold">
                  See all
                </Link>
              )}
            </h2>
            {recentViews.length > 0 ? (
              <ExpenseDays expenses={recentViews} today={today} currency={summary.currency} />
            ) : (
              <EmptyMonth isCurrent={isCurrent} />
            )}
          </section>
        </div>

        <CategoryRoster summary={summary} />
      </div>
    </main>
  );
}

function MonthBlock({
  summary,
  month,
  current,
  isCurrent,
}: {
  summary: MonthSummary;
  month: YearMonth;
  current: YearMonth;
  isCurrent: boolean;
}) {
  const lead = summary.byCategory[0];
  const ink = inkFor(lead?.category?.color ?? null);
  const onDark = ink.onDark;
  const monthName = formatMonth(month, "short");

  return (
    <section
      aria-label={`${monthName} overview`}
      data-surface={onDark ? "dark" : "light"}
      className={cn("px-4 pt-4 pb-5 lg:px-8 lg:pt-6 lg:pb-7", ink.bg, ink.text)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold tracking-tight lg:invisible">
          <Wordmark />
        </span>
        <MonthSwitcher month={month} current={current} basePath="/home" tone={onDark ? "white" : "ink"} />
      </div>
      <h1 className="mt-7 lg:mt-10">
        <span className="block text-[clamp(3.5rem,17vw,5.5rem)] leading-[0.9] font-extrabold tracking-[-0.04em] lg:text-[7.5rem]">
          <CountUp minor={summary.total.minor} currency={summary.currency} storageKey={`home-total-${month}`} />
        </span>
        <span className="mt-2 block text-lg font-bold">
          spent {isCurrent ? `in ${monthName} so far` : `in ${formatMonth(month)}`}
        </span>
      </h1>
      <p className="mt-1 text-base font-semibold opacity-90">
        {lead
          ? `Most of it went on ${(lead.category?.name ?? "uncategorised spending").toLowerCase()}.`
          : isCurrent
            ? "Nothing logged yet this month."
            : "Nothing was logged this month."}
      </p>
      <PackagingStripe
        className={cn("mt-5", onDark && "ring-white")}
        segments={summary.byCategory.map((c) => ({
          color: c.category?.color ?? null,
          share: c.share,
          label: c.category?.name ?? "Uncategorised",
        }))}
      />
    </section>
  );
}

function Stories({
  summary,
  isCurrent,
  previous,
  today,
  nextPayment,
}: {
  summary: MonthSummary;
  isCurrent: boolean;
  previous: MonthSummary | null;
  today: IsoDate;
  nextPayment: (Upcoming & { category: Category | null }) | null;
}) {
  const dayOfMonth = Number(today.slice(8, 10));
  const cards: React.ReactNode[] = [];
  const recapReady = previous && !previous.total.isZero();
  const recap = recapReady ? (
    <StoryCard key="recap" href={`/recap/${previous.month}`} tone="ink">
      <span className="text-xl leading-[1.05] font-extrabold">
        Your {formatMonth(previous.month, "short")}, wrapped
      </span>
      <span className="text-[13px] font-semibold">{previous.count} purchases</span>
    </StoryCard>
  ) : null;
  // Early in a month, last month's recap is the news; later it moves to the end.
  const earlyInMonth = dayOfMonth <= 10;
  if (recap && earlyInMonth) cards.push(recap);

  // The colour block already speaks for the top category, so stories start
  // with the next two (and never repeat the block's ink right under it).
  for (const spend of summary.byCategory.slice(1, 3)) {
    cards.push(
      <StoryCard
        key={spend.category?.id ?? "none"}
        color={spend.category?.color ?? null}
        tag={spend.category?.name ?? "uncategorised"}
        href={`/activity?category=${spend.category?.id ?? "none"}&month=${summary.month}`}
      >
        <span className="text-[2rem] leading-none font-extrabold tracking-[-0.03em]">{spend.total.format()}</span>
        <span className="text-[13px] font-semibold">
          {spend.count} {spend.count === 1 ? "purchase" : "purchases"} · {Math.round(spend.share * 100)}%
        </span>
      </StoryCard>,
    );
  }

  if (isCurrent && summary.previousToDate && !summary.previousToDate.isZero() && !summary.total.isZero()) {
    const diff = summary.total.subtract(summary.previousToDate);
    const previousName = formatMonth(previous?.month ?? summary.month, "short");
    cards.push(
      <StoryCard key="compare" tone="outline">
        <span className="text-[2rem] leading-none font-extrabold tracking-[-0.03em]">
          {diff.isNegative() ? "−" : "+"}
          {diff.abs().format()}
        </span>
        <span className="text-[13px] font-semibold">
          {diff.isNegative() ? "less" : "more"} than {previousName} by the {ordinal(dayOfMonth)}
        </span>
      </StoryCard>,
    );
  }

  const biggest = summary.byDay.reduce<(typeof summary.byDay)[number] | null>(
    (best, d) => (d.total.minor > (best?.total.minor ?? 0) ? d : best),
    null,
  );
  if (biggest) {
    cards.push(
      <StoryCard key="biggest" tone="ink">
        <span className="text-[2rem] leading-none font-extrabold tracking-[-0.03em]">{biggest.total.format()}</span>
        <span className="text-[13px] font-semibold">Biggest day: {formatDay(biggest.day, today)}</span>
      </StoryCard>,
    );
  }
  if (nextPayment) {
    cards.push(
      <StoryCard
        key="next"
        href="/recurring"
        color={nextPayment.category?.color ?? null}
        tag={nextPayment.category?.name ?? "uncategorised"}
      >
        <span className="text-[2rem] leading-none font-extrabold tracking-[-0.03em]">{nextPayment.rule.amount.format()}</span>
        <span className="text-[13px] font-semibold">
          {nextPayment.rule.title}, {formatDay(nextPayment.dueOn, today).replace(/^Today$/, "today")}
        </span>
      </StoryCard>,
    );
  }
  if (recap && !earlyInMonth) cards.push(recap);

  if (cards.length === 0) return null;
  return <StoryRail label="This month at a glance">{cards}</StoryRail>;
}

/** The one budget most worth a warning right now, shown as a band. */
function BudgetAlert({ status }: { status: BudgetStatus & { category: Category | null } }) {
  const ink = inkFor(status.category?.color ?? null);
  const name = status.category?.name.toLowerCase() ?? "overall";
  const over = status.state === "over";
  return (
    <Link
      href="/budgets"
      className={cn("mx-4 mt-4 flex items-stretch border-2 no-underline hover:bg-wash lg:mx-0", over ? "border-danger" : "border-ink")}
    >
      <span className={cn("flex items-center px-3 text-sm font-extrabold lowercase", ink.bg, ink.text)}>{name}</span>
      <span className="flex-1 px-3 py-2.5 text-[15px] font-semibold">
        {over ? (
          <>
            <strong className="text-danger">{status.remaining.abs().format()} over</strong> your{" "}
            {status.budget.amount.format()} {status.category ? `${name} ` : ""}budget
          </>
        ) : (
          <>
            <strong>{status.remaining.format()} left</strong> of your {status.budget.amount.format()}{" "}
            {status.category ? `${name} ` : ""}budget
          </>
        )}
      </span>
    </Link>
  );
}

function CategoryRoster({ summary }: { summary: MonthSummary }) {
  if (summary.byCategory.length === 0) return null;
  return (
    <section aria-labelledby="roster-heading" className="hidden lg:block">
      <h2 id="roster-heading" className="pb-3 text-xl font-extrabold">
        Where it went
      </h2>
      <ol className="grid gap-1.5">
        {summary.byCategory.map((spend) => {
          const ink = inkFor(spend.category?.color ?? null);
          return (
            <li key={spend.category?.id ?? "none"}>
              <Link
                href={`/activity?category=${spend.category?.id ?? "none"}&month=${summary.month}`}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-[15px] font-extrabold lowercase no-underline",
                  ink.bg,
                  ink.text,
                )}
              >
                {spend.category?.name ?? "uncategorised"}
                <span className="font-semibold normal-case">{spend.total.format()}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EmptyMonth({ isCurrent }: { isCurrent: boolean }) {
  return (
    <div className="mx-4 border-2 border-dashed border-ink p-5 lg:mx-0">
      <p className="text-lg font-extrabold">{isCurrent ? "Nothing here yet." : "No spending this month."}</p>
      {isCurrent && (
        <p className="mt-1 text-muted">
          Scan your next receipt and it&rsquo;ll appear here, itemised and filed under the right category.
        </p>
      )}
    </div>
  );
}
