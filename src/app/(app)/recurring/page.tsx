import { Plus } from "lucide-react";
import Link from "next/link";
import { todayIn } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { categoryMap } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { ButtonLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { formatDay } from "@/ui/format";
import { inkFor } from "@/ui/inks";

export const metadata = { title: "Recurring payments" };

const EVERY = { weekly: "weekly", monthly: "monthly", yearly: "yearly" } as const;

export default async function RecurringPage() {
  const user = await requireUser();
  const { recurring, categories } = getServices();
  const [rules, upcoming, perMonth, list] = await Promise.all([
    recurring.list(user.id),
    recurring.upcoming(user.id, 30),
    recurring.monthlyCost(user.id),
    categories.list(user.id),
  ]);
  const byId = categoryMap(list);
  const today = todayIn();
  const active = rules.filter((r) => !r.paused && r.nextDueOn);
  const inactive = rules.filter((r) => r.paused || !r.nextDueOn);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 lg:px-8">
      <BackLink href="/insights">Insights</BackLink>
      <header className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Recurring</h1>
        <ButtonLink href="/recurring/new" className="px-3 py-2 text-sm">
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          Add
        </ButtonLink>
      </header>

      {rules.length === 0 ? (
        <div className="border-2 border-dashed border-ink p-5">
          <p className="text-lg font-extrabold">No recurring payments yet.</p>
          <p className="mt-1 text-muted">
            Add rent, bills and subscriptions once, and ExpenseIt logs each payment on the day it&rsquo;s due.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="cost-heading" className="border-y-2 border-ink py-6">
            <h2 id="cost-heading" className="text-[clamp(1.75rem,6vw,2.5rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
              About {perMonth.format()} a month
              <span className="text-muted"> in regular payments.</span>
            </h2>
            <p className="mt-2 text-sm text-muted">
              An estimate at today&rsquo;s exchange rates; weekly payments vary a little by month.
            </p>
          </section>

          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming-heading" className="mt-8">
              <h2 id="upcoming-heading" className="text-xl font-extrabold">
                Coming up in the next 30 days
              </h2>
              <ol className="mt-2">
                {upcoming.map(({ rule, dueOn }) => (
                  <li key={`${rule.id}-${dueOn}`} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5">
                    <span>
                      <span className="inline-block w-24 text-sm font-bold text-muted">{formatDay(dueOn, today)}</span>
                      <span className="font-bold">{rule.title}</span>
                    </span>
                    <span className="font-extrabold">{rule.amount.format()}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="all-heading" className="mt-10">
            <h2 id="all-heading" className="text-xl font-extrabold">
              All recurring payments
            </h2>
            <ul className="mt-2">
              {[...active, ...inactive].map((rule) => {
                const category = rule.categoryId ? byId.get(rule.categoryId) : undefined;
                return (
                  <li key={rule.id}>
                    <Link
                      href={`/recurring/${rule.id}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-rule py-3 no-underline hover:bg-wash"
                    >
                      <span aria-hidden className={cn("h-[34px] w-3.5 ring-1 ring-ink", inkFor(category?.color).bg)} />
                      <span className="min-w-0">
                        <strong className="block truncate font-bold">{rule.title}</strong>
                        <span className="text-[13px] text-muted">
                          {category?.name ?? "Uncategorised"} ·{" "}
                          {rule.paused
                            ? "paused"
                            : rule.nextDueOn
                              ? `next ${formatDay(rule.nextDueOn, today)}`
                              : "ended"}
                        </span>
                      </span>
                      <span className="text-right">
                        <strong className="block font-extrabold">{rule.amount.format()}</strong>
                        <span className="text-[13px] text-muted">{EVERY[rule.frequency]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
