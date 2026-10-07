"use client";

import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeBudget, setBudget } from "@/app/actions/budgets";
import type { CategoryColor } from "@/domain/category";
import type { ActionResult } from "@/server/actions";
import { Button } from "./button";
import { cn } from "./cn";
import { Input } from "./field";
import { inkFor } from "./inks";
import { Select } from "./select";

export interface BudgetRowView {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly color: CategoryColor | null;
  /** Decimal string, for editing. */
  readonly amount: string;
  readonly amountText: string;
  readonly spentText: string;
  /** Always positive; `state` says whether it's left or over. */
  readonly remainingText: string;
  readonly state: "under" | "near" | "over";
  readonly ratio: number;
}

function useBudgetAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error);
      else {
        onDone?.();
        router.refresh();
      }
    });
  return { pending, error, run };
}

/** A bar of spending against a budget; past 100% it fills and turns its rule red. */
export function BudgetBar({ ratio, color, state, thick = false }: { ratio: number; color: CategoryColor | null | "ink"; state: BudgetRowView["state"]; thick?: boolean }) {
  return (
    <span className={cn("block bg-wash ring-2", thick ? "h-6" : "h-3.5", state === "over" ? "ring-danger" : "ring-ink")}>
      <span
        className={cn("block h-full", color === "ink" ? "bg-ink" : inkFor(color).bg)}
        style={{ width: `${Math.max(Math.min(ratio, 1) * 100, ratio > 0 ? 2 : 0)}%` }}
      />
    </span>
  );
}

export function StateLine({ row }: { row: BudgetRowView }) {
  return row.state === "over" ? (
    <span className="font-bold text-danger">{row.remainingText} over</span>
  ) : (
    <span className={cn(row.state === "near" && "font-bold")}>
      {row.remainingText} left{row.state === "near" && ", nearly there"}
    </span>
  );
}

/** "Edit" that opens an inline amount form, with Remove. */
export function EditBudget({ row }: { row: BudgetRowView }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(row.amount);
  const { pending, error, run } = useBudgetAction();

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm font-bold hover:underline">
        <Pencil aria-hidden className="size-3.5" strokeWidth={2.5} />
        Edit<span className="sr-only"> the {row.name} budget</span>
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setBudget(row.categoryId, amount), () => setEditing(false));
      }}
      className="col-span-full flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor={`budget-${row.id}`}>
        Monthly budget for {row.name}
      </label>
      <Input id={`budget-${row.id}`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-32" autoFocus />
      <Button type="submit" disabled={pending} className="py-2.5">
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        Save
      </Button>
      <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="py-2.5">
        Cancel
      </Button>
      <Button type="button" variant="ghost" onClick={() => run(() => removeBudget(row.id))} className="ml-auto py-2.5 text-danger">
        <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
        Remove
      </Button>
      {error && <p role="alert" className="w-full text-sm font-semibold text-danger">{error}</p>}
    </form>
  );
}

export function BudgetRow({ row }: { row: BudgetRowView }) {
  const ink = inkFor(row.color);
  return (
    <li className="grid gap-2 border-b border-rule py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={cn("px-2 py-1 text-sm font-extrabold lowercase", ink.bg, ink.text)}>{row.name}</span>
        <EditBudget row={row} />
      </div>
      <BudgetBar ratio={row.ratio} color={row.color} state={row.state} />
      <p className="flex flex-wrap justify-between gap-x-4 text-sm">
        <span>
          <strong className="font-extrabold">{row.spentText}</strong> of {row.amountText}
        </span>
        <StateLine row={row} />
      </p>
    </li>
  );
}

/** Set a budget for a category that doesn't have one, or the overall one. */
export function AddBudget({
  options,
  currencySymbol,
  overallMissing,
}: {
  options: ReadonlyArray<{ id: string; name: string }>;
  currencySymbol: string;
  overallMissing: boolean;
}) {
  const [target, setTarget] = useState(overallMissing ? "overall" : (options[0]?.id ?? ""));
  const [amount, setAmount] = useState("");
  const { pending, error, run } = useBudgetAction();
  if (!overallMissing && options.length === 0) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setBudget(target === "overall" ? null : target, amount), () => setAmount(""));
      }}
      className="grid gap-2 border-2 border-ink p-4"
    >
      <p className="font-extrabold">Add a budget</p>
      <div className="grid grid-cols-[1fr_8rem] gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <label>
          <span className="sr-only">What to budget for</span>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {overallMissing && <option value="overall">All spending</option>}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="relative">
          <span className="sr-only">Amount per month</span>
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-bold">
            {currencySymbol}
          </span>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="pl-7" required />
        </label>
        <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
          <Plus aria-hidden className="size-5" strokeWidth={2.5} />
          Add budget
        </Button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </form>
  );
}
