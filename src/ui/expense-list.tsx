import { Receipt } from "lucide-react";
import Link from "next/link";
import { cn } from "./cn";
import { formatDay, formatMinor } from "./format";
import { inkFor } from "./inks";
import type { ExpenseView } from "./types";

/** One expense: what, where it was filed, and how much in your currency. */
export function ExpenseRow({ expense }: { expense: ExpenseView }) {
  return (
    <li>
      <Link
        href={`/expenses/${expense.id}`}
        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-rule px-4 py-3 no-underline hover:bg-wash lg:px-0 lg:hover:bg-transparent lg:hover:[&_strong]:underline"
      >
        <span aria-hidden className={cn("h-[34px] w-3.5 ring-1 ring-ink", inkFor(expense.category?.color).bg)} />
        <span className="min-w-0">
          <strong className="block truncate text-[15px] font-bold">{expense.title}</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            <span className="truncate">{expense.category?.name ?? "Uncategorised"}</span>
            {expense.receiptId && (
              <>
                <span aria-hidden>·</span>
                <Receipt aria-label="From a receipt" className="size-3.5 shrink-0" />
              </>
            )}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-base font-extrabold">{expense.homeAmount}</span>
          {expense.isForeign && <span className="block text-[12px] text-muted">{expense.amount}</span>}
        </span>
      </Link>
    </li>
  );
}

/** Expenses grouped under day headings, each with its day total. */
export function ExpenseDays({
  expenses,
  today,
  currency,
}: {
  expenses: readonly ExpenseView[];
  today: string;
  currency: string;
}) {
  const days = new Map<string, ExpenseView[]>();
  for (const expense of expenses) {
    days.set(expense.spentOn, [...(days.get(expense.spentOn) ?? []), expense]);
  }
  return (
    <div className="grid gap-4">
      {[...days].map(([day, items]) => (
        <section key={day} aria-label={formatDay(day, today)}>
          <h3 className="flex justify-between px-4 pb-1.5 text-[13px] font-bold lg:px-0">
            {formatDay(day, today)}
            <span className="font-semibold text-muted">
              {formatMinor(
                items.reduce((sum, e) => sum + e.homeMinor, 0),
                currency,
              )}
            </span>
          </h3>
          <ul>
            {items.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
