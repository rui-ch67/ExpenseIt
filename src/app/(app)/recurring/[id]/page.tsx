import { notFound } from "next/navigation";
import { deleteRecurring } from "@/app/actions/recurring";
import { CURRENCY_CODES } from "@/domain/currency";
import { NotFoundError } from "@/domain/errors";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { DeleteButton } from "@/ui/delete-button";
import { formatLongDate } from "@/ui/format";
import { PauseButton, RecurringForm } from "@/ui/recurring-form";

export const metadata = { title: "Recurring payment" };

export default async function EditRecurringPage({ params }: PageProps<"/recurring/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { recurring, categories } = getServices();
  const rule = await recurring.get(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const list = await categories.list(user.id);
  const status = rule.paused
    ? "Paused. Nothing is logged until you resume it."
    : rule.nextDueOn
      ? `Next payment ${formatLongDate(rule.nextDueOn)}.`
      : "Ended. No more payments will be logged.";

  return (
    <main className="mx-auto max-w-xl px-4 pb-10 lg:px-8">
      <BackLink href="/recurring">Recurring</BackLink>
      <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] break-words">{rule.title}</h1>
      <p className="mt-2 pb-5 text-muted">{status}</p>
      <div className="pb-6">
        <PauseButton id={rule.id} paused={rule.paused} />
      </div>
      <RecurringForm
        values={{
          id: rule.id,
          title: rule.title,
          amount: rule.amount.toDecimalString(),
          currency: rule.amount.currency,
          frequency: rule.frequency,
          startsOn: rule.startsOn,
          endsOn: rule.endsOn ?? "",
          categoryId: rule.categoryId,
          note: rule.note,
        }}
        categories={list.map(toCategoryView)}
        currencies={CURRENCY_CODES}
      />
      <p className="mt-3 text-sm text-muted">Changes apply to future payments. Expenses already logged stay as they are.</p>
      <div className="mt-8 grid border-t-2 border-ink pt-5">
        <DeleteButton
          label="Delete this recurring payment"
          confirmLabel="Stop it for good? Expenses it already logged are kept."
          action={deleteRecurring.bind(null, rule.id)}
        />
      </div>
    </main>
  );
}
