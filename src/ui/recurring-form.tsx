"use client";

import { LoaderCircle, Pause, Play } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { saveRecurring, setRecurringPaused } from "@/app/actions/recurring";
import { Button } from "./button";
import { CategoryPicker } from "./category-picker";
import { cn } from "./cn";
import { Field, Input, Textarea } from "./field";
import { Select } from "./select";
import type { CategoryView } from "./types";

export interface RecurringFormValues {
  readonly id?: string;
  readonly title: string;
  readonly amount: string;
  readonly currency: string;
  readonly frequency: "weekly" | "monthly" | "yearly";
  readonly startsOn: string;
  readonly endsOn: string;
  readonly categoryId: string | null;
  readonly note: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
] as const;

export function RecurringForm({
  values,
  categories,
  currencies,
}: {
  values: RecurringFormValues;
  categories: readonly CategoryView[];
  currencies: readonly string[];
}) {
  const [state, action, pending] = useActionState(saveRecurring, null);
  const error = state && !state.ok ? state.error : null;
  return (
    <form action={action} className="grid gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="What is it?" htmlFor="title">
        <Input id="title" name="title" defaultValue={values.title} required maxLength={120} placeholder="e.g. Rent, Spotify, phone contract" />
      </Field>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label="Amount" htmlFor="amount">
          <Input id="amount" name="amount" defaultValue={values.amount} inputMode="decimal" required placeholder="0.00" className="py-2 text-xl font-extrabold" />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={values.currency}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-bold">How often</legend>
        <div className="flex flex-wrap gap-1.5">
          {FREQUENCIES.map((f) => (
            <label key={f.value} className="cursor-pointer">
              <input type="radio" name="frequency" value={f.value} defaultChecked={values.frequency === f.value} className="peer sr-only" />
              <span className="inline-block border-2 border-ink px-3 py-2 text-sm font-bold peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {f.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <Field label="First payment" htmlFor="startsOn" hint="Past dates log what's been paid since.">
          <Input id="startsOn" name="startsOn" type="date" defaultValue={values.startsOn} required />
        </Field>
        <Field label="Last payment" htmlFor="endsOn" hint="Optional.">
          <Input id="endsOn" name="endsOn" type="date" defaultValue={values.endsOn} />
        </Field>
      </div>
      <CategoryPicker name="categoryId" categories={categories} defaultValue={values.categoryId} />
      <Field label="Note" htmlFor="note" hint="Optional. Added to every expense it logs.">
        <Textarea id="note" name="note" defaultValue={values.note} rows={2} maxLength={1000} />
      </Field>
      {error && (
        <p role="alert" className="border-2 border-danger p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
        {values.id ? "Save changes" : "Add recurring payment"}
      </Button>
    </form>
  );
}

export function PauseButton({ id, paused }: { id: string; paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setRecurringPaused(id, !paused);
            if (!result.ok) setError(result.error);
          })
        }
        className={cn("justify-self-start")}
      >
        {paused ? <Play aria-hidden className="size-4" strokeWidth={2.5} /> : <Pause aria-hidden className="size-4" strokeWidth={2.5} />}
        {paused ? "Resume" : "Pause"}
      </Button>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
