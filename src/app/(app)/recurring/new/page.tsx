import { CURRENCY_CODES } from "@/domain/currency";
import { todayIn } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { RecurringForm } from "@/ui/recurring-form";

export const metadata = { title: "Add a recurring payment" };

export default async function NewRecurringPage() {
  const user = await requireUser();
  const { categories, settings } = getServices();
  const [list, currency] = await Promise.all([categories.list(user.id), settings.homeCurrency(user.id)]);
  return (
    <main className="mx-auto max-w-xl px-4 pb-10 lg:px-8">
      <BackLink href="/recurring">Recurring</BackLink>
      <h1 className="pb-6 text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Add a recurring payment</h1>
      <RecurringForm
        values={{ title: "", amount: "", currency, frequency: "monthly", startsOn: todayIn(), endsOn: "", categoryId: null, note: "" }}
        categories={list.map(toCategoryView)}
        currencies={CURRENCY_CODES}
      />
    </main>
  );
}
