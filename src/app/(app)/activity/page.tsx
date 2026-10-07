import { PenLine, ReceiptText } from "lucide-react";
import { addMonths, todayIn } from "@/domain/dates";
import { listExpenses } from "@/app/actions/expenses";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { ActivityFilters } from "@/ui/activity-filters";
import { ActivityList } from "@/ui/activity-list";
import { ButtonLink } from "@/ui/button";
import { PageHeader } from "@/ui/page-header";

export const metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser();
  const params = await searchParams;
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const filters = { q: pick("q"), category: pick("category"), month: pick("month") };

  const { categories, insights, settings } = getServices();
  const [result, list, currency] = await Promise.all([
    listExpenses(filters),
    categories.list(user.id),
    settings.homeCurrency(user.id),
  ]);
  const current = insights.currentMonth();
  const months = Array.from({ length: 12 }, (_, i) => addMonths(current, -i));
  const filtered = Boolean(filters.q || filters.category || filters.month);

  return (
    <main className="mx-auto max-w-3xl pb-10 lg:px-8">
      <PageHeader title="Activity">
        <div className="flex gap-2">
        <ButtonLink href="/receipts" variant="secondary" className="px-3 py-2 text-sm">
          <ReceiptText aria-hidden className="size-4" strokeWidth={2.5} />
          Receipts
        </ButtonLink>
        <ButtonLink href="/expenses/new" variant="secondary" className="px-3 py-2 text-sm">
          <PenLine aria-hidden className="size-4" strokeWidth={2.5} />
          Add
        </ButtonLink>
        </div>
      </PageHeader>
      <ActivityFilters categories={list.map(toCategoryView)} months={months} />
      <div className="mt-6">
        {!result.ok ? (
          <p role="alert" className="px-4 font-semibold text-danger">
            {result.error}
          </p>
        ) : result.data.items.length === 0 ? (
          <div className="mx-4 border-2 border-dashed border-ink p-5 lg:mx-0">
            <p className="text-lg font-extrabold">{filtered ? "Nothing matches those filters." : "No spending yet."}</p>
            <p className="mt-1 text-muted">
              {filtered ? "Try another search or clear the filters." : "Scan a receipt or add an expense by hand."}
            </p>
          </div>
        ) : (
          <ActivityList
            key={JSON.stringify(filters)}
            initial={result.data.items}
            initialCursor={result.data.nextCursor}
            filters={filters}
            today={todayIn()}
            currency={currency}
          />
        )}
      </div>
    </main>
  );
}
