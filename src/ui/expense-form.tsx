"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { saveExpense } from "@/app/actions/expenses";
import { Button } from "./button";
import { CategoryPicker } from "./category-picker";
import { Field, Input, Textarea } from "./field";
import { Select } from "./select";
import type { CategoryView } from "./types";

export interface ExpenseFormValues {
  readonly id?: string;
  readonly title: string;
  readonly amount: string;
  readonly currency: string;
  readonly spentOn: string;
  readonly categoryId: string | null;
  readonly note: string;
}

export function ExpenseForm({
  values,
  categories,
  currencies,
  today,
}: {
  values: ExpenseFormValues;
  categories: readonly CategoryView[];
  currencies: ReadonlyArray<{ code: string; name: string }>;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveExpense, null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={action} className="grid gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="What was it?" htmlFor="title">
        <Input id="title" name="title" defaultValue={values.title} required maxLength={120} placeholder="e.g. Tesco, rent, train to Brighton" />
      </Field>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label="Amount" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            defaultValue={values.amount}
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="0.00"
            className="py-2 text-xl font-extrabold"
          />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={values.currency}>
            {currencies.map((c) => (
              <option key={c.code} value={c.code} title={c.name}>
                {c.code}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Date" htmlFor="spentOn">
        <Input id="spentOn" name="spentOn" type="date" defaultValue={values.spentOn} max={today} required />
      </Field>
      <CategoryPicker name="categoryId" categories={categories} defaultValue={values.categoryId} />
      <Field label="Note" htmlFor="note" hint="Optional.">
        <Textarea id="note" name="note" defaultValue={values.note} maxLength={1000} rows={2} />
      </Field>
      {error && (
        <p role="alert" className="border-2 border-danger p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
        {values.id ? "Save changes" : "Add expense"}
      </Button>
    </form>
  );
}
