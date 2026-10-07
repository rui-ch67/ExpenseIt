import { Receipt, Repeat } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteExpense } from "@/app/actions/expenses";
import { CURRENCIES, CURRENCY_CODES } from "@/domain/currency";
import { NotFoundError } from "@/domain/errors";
import { todayIn } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { DeleteButton } from "@/ui/delete-button";
import { ExpenseForm } from "@/ui/expense-form";
import { formatLongDate } from "@/ui/format";

export const metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { expenses, categories } = getServices();
  const expense = await expenses.get(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const list = await categories.list(user.id);
  const isForeign = expense.amount.currency !== expense.homeAmount.currency;

  return (
    <main className="mx-auto max-w-xl px-4 pb-10 lg:px-8">
      <BackLink href="/activity">Activity</BackLink>
      <h1 className="pb-2 text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] break-words">{expense.title}</h1>
      <p className="pb-6 text-muted">
        {expense.homeAmount.format()} on {formatLongDate(expense.spentOn)}
        {isForeign && ` (${expense.amount.format()} at ${expense.fxRate}, the rate on ${formatLongDate(expense.fxRateDate)})`}
      </p>
      {expense.recurringRuleId && (
        <Link
          href={`/recurring/${expense.recurringRuleId}`}
          className="mb-6 flex items-center gap-2 border-2 border-ink px-3 py-2.5 font-bold no-underline hover:bg-wash"
        >
          <Repeat aria-hidden className="size-5" strokeWidth={2.5} />
          Logged automatically by a recurring payment · manage it
        </Link>
      )}
      {expense.receiptId && (
        <Link
          href={`/receipts/${expense.receiptId}`}
          className="mb-6 flex items-center gap-2 border-2 border-ink px-3 py-2.5 font-bold no-underline hover:bg-wash"
        >
          <Receipt aria-hidden className="size-5" strokeWidth={2.5} />
          From a scanned receipt · view it
        </Link>
      )}
      <ExpenseForm
        values={{
          id: expense.id,
          title: expense.title,
          amount: expense.amount.toDecimalString(),
          currency: expense.amount.currency,
          spentOn: expense.spentOn,
          categoryId: expense.categoryId,
          note: expense.note,
        }}
        categories={list.map(toCategoryView)}
        currencies={CURRENCY_CODES.map((code) => ({ code, name: CURRENCIES[code].name }))}
        today={todayIn()}
      />
      <div className="mt-8 grid border-t-2 border-ink pt-5">
        <DeleteButton
          label="Delete this expense"
          confirmLabel="Delete it for good? This can't be undone."
          action={deleteExpense.bind(null, expense.id)}
        />
      </div>
    </main>
  );
}
