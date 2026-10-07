"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { type ExpenseFilters, listExpenses } from "@/app/actions/expenses";
import { Button } from "./button";
import { ExpenseDays } from "./expense-list";
import type { ExpenseView } from "./types";

/** The first page arrives from the server; "Show more" fetches the next with its cursor. */
export function ActivityList({
  initial,
  initialCursor,
  filters,
  today,
  currency,
}: {
  initial: ExpenseView[];
  initialCursor: string | null;
  filters: ExpenseFilters;
  today: string;
  currency: string;
}) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await listExpenses(filters, cursor);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => [...current, ...result.data.items]);
      setCursor(result.data.nextCursor);
    });
  }

  return (
    <div className="grid gap-6">
      <ExpenseDays expenses={items} today={today} currency={currency} />
      {error && (
        <p role="alert" className="px-4 text-sm font-semibold text-danger lg:px-0">
          {error}
        </p>
      )}
      {cursor && (
        <Button variant="secondary" onClick={loadMore} disabled={pending} className="mx-4 lg:mx-0 lg:justify-self-start">
          {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
          Show more
        </Button>
      )}
    </div>
  );
}
