import { CURRENCIES, CURRENCY_CODES } from "@/domain/currency";
import { todayIn } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { ExpenseForm } from "@/ui/expense-form";

export const metadata = { title: "Add an expense" };

export default async function NewExpensePage() {
  const user = await requireUser();
  const { categories, settings, expenses } = getServices();
  const [list, currency, habits] = await Promise.all([
    categories.list(user.id),
    settings.homeCurrency(user.id),
    expenses.categoryHabits(user.id),
  ]);
  const today = todayIn();
  return (
    <main className="mx-auto max-w-xl px-4 pb-10 lg:px-8">
      <BackLink href="/home">Home</BackLink>
      <h1 className="pb-6 text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Add an expense</h1>
      <ExpenseForm
        values={{ title: "", amount: "", currency, spentOn: today, categoryId: null, note: "" }}
        categories={list.map(toCategoryView)}
        habits={habits}
        currencies={CURRENCY_CODES.map((code) => ({ code, name: CURRENCIES[code].name }))}
        today={today}
      />
    </main>
  );
}
