"use client";

import { ArrowDown, ArrowUp, Check, LoaderCircle, LogOut, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";
import {
  changeHomeCurrency,
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/app/actions/settings";
import { CATEGORY_COLORS, type CategoryColor } from "@/domain/category";
import { authClient } from "@/lib/auth-client";
import type { ActionResult } from "@/server/actions";
import { Button } from "./button";
import { cn } from "./cn";
import { Input } from "./field";
import { inkFor } from "./inks";
import { Select } from "./select";
import type { CategoryView } from "./types";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else {
        onDone?.();
        router.refresh();
      }
    });
  };
  return { pending, error, run };
}

export function CurrencyForm({ current, currencies }: { current: string; currencies: ReadonlyArray<{ code: string; name: string }> }) {
  const [value, setValue] = useState(current);
  const [done, setDone] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Home currency</span>
          <Select value={value} onChange={(e) => { setValue(e.target.value); setDone(false); }}>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        </label>
        <Button
          variant="secondary"
          disabled={pending || value === current}
          onClick={() => run(() => changeHomeCurrency(value), () => setDone(true))}
        >
          {pending ? <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} /> : null}
          Change
        </Button>
      </div>
      <p className={cn("text-sm", error ? "font-semibold text-danger" : "text-muted")} role={error ? "alert" : undefined}>
        {error ??
          (done
            ? "Done. Every expense was converted at the rate from the day it was spent."
            : pending
              ? "Converting your expenses at each day's rate…"
              : "Totals and budgets use this currency. Changing it converts past spending at each day's rate.")}
      </p>
    </div>
  );
}

function ColourChoice({ name, value, onChange }: { name: string; value: CategoryColor; onChange: (c: CategoryColor) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">Colour</legend>
      {CATEGORY_COLORS.map((color) => (
        <label key={color} className="cursor-pointer">
          <input type="radio" name={name} value={color} checked={value === color} onChange={() => onChange(color)} className="peer sr-only" />
          <span
            className={cn(
              "grid size-8 place-items-center ring-1 ring-ink ring-offset-0 peer-checked:ring-2 peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4",
              inkFor(color).bg,
              inkFor(color).text,
            )}
          >
            {value === color && <Check aria-hidden className="size-4" strokeWidth={3} />}
            <span className="sr-only">{color}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CategoryManager({ categories }: { categories: readonly CategoryView[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { pending, error, run } = useAction();
  const ids = categories.map((c) => c.id);

  const move = (index: number, delta: number) => {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    run(() => reorderCategories(next));
  };

  return (
    <div className="grid gap-3">
      <ol className="grid gap-1.5" aria-busy={pending}>
        {categories.map((category, index) =>
          editing === category.id ? (
            <li key={category.id}>
              <CategoryEditor
                initial={category}
                onCancel={() => setEditing(null)}
                onSave={(input) => run(() => updateCategory(category.id, input), () => setEditing(null))}
                onDelete={() => run(() => deleteCategory(category.id), () => setEditing(null))}
                pending={pending}
              />
            </li>
          ) : (
            <li key={category.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(category.id)}
                className={cn("flex-1 px-3 py-2.5 text-left font-extrabold lowercase", inkFor(category.color).bg, inkFor(category.color).text)}
              >
                {category.name}
                <span className="sr-only">: edit</span>
              </button>
              <button type="button" aria-label={`Move ${category.name} up`} disabled={index === 0 || pending} onClick={() => move(index, -1)} className="grid w-10 place-items-center border-2 border-ink disabled:opacity-30">
                <ArrowUp aria-hidden className="size-4" strokeWidth={2.5} />
              </button>
              <button type="button" aria-label={`Move ${category.name} down`} disabled={index === categories.length - 1 || pending} onClick={() => move(index, 1)} className="grid w-10 place-items-center border-2 border-ink disabled:opacity-30">
                <ArrowDown aria-hidden className="size-4" strokeWidth={2.5} />
              </button>
            </li>
          ),
        )}
      </ol>
      {adding ? (
        <CategoryEditor
          initial={{ id: "new", name: "", color: "teal" }}
          onCancel={() => setAdding(false)}
          onSave={(input) => run(() => createCategory({ name: input.name ?? "", color: input.color ?? "teal" }), () => setAdding(false))}
          pending={pending}
        />
      ) : (
        <Button variant="secondary" className="justify-self-start" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-5" strokeWidth={2.5} />
          New category
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function CategoryEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
  pending,
}: {
  initial: CategoryView;
  onSave: (input: { name: string; color: CategoryColor }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState<CategoryColor>(initial.color);
  const [confirming, setConfirming] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, color });
      }}
      className="grid gap-3 border-2 border-ink p-3"
    >
      <label className="grid gap-1.5">
        <span className="text-sm font-bold">Name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
      </label>
      <ColourChoice name={`colour-${initial.id}`} value={color} onChange={setColor} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {initial.id === "new" ? "Add category" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        {onDelete &&
          (confirming ? (
            <Button type="button" variant="danger" onClick={onDelete} disabled={pending} className="ml-auto">
              Delete; its expenses become uncategorised
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirming(true)} className="ml-auto text-danger" aria-label={`Delete ${initial.name}`}>
              <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
              Delete
            </Button>
          ))}
      </div>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden className="size-5" strokeWidth={2.5} />
      Sign out
    </Button>
  );
}

/** Deleting an account takes typing "delete": it can't be undone. */
export function DeleteAccount({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!open) {
    return (
      <Button variant="ghost" className="justify-self-start px-0 text-danger hover:bg-transparent hover:underline" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
        {isDemo ? "Delete this demo account now" : "Delete my account"}
      </Button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await deleteAccount(typed);
          if (result && !result.ok) setError(result.error);
        });
      }}
      className="grid gap-3 border-2 border-danger p-4"
    >
      <p className="font-semibold">
        This deletes every expense, receipt, photo, budget and recurring payment in this account. It can&rsquo;t be undone.
      </p>
      <label className="grid gap-1.5">
        <span className="text-sm font-bold">Type &ldquo;delete&rdquo; to confirm</span>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" disabled={pending || typed.trim().toLowerCase() !== "delete"}>
          {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
          Delete everything
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Keep my account
        </Button>
      </div>
    </form>
  );
}
