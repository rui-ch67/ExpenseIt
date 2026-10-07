"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveReviewedReceipt } from "@/app/actions/receipts";
import { type CurrencyCode, isCurrencyCode } from "@/domain/currency";
import { Money, sum } from "@/domain/money";
import { splitReceipt } from "@/domain/receipt-split";
import { Button } from "./button";
import { CategoryPicker } from "./category-picker";
import { cn } from "./cn";
import { Field, Input } from "./field";
import { inkFor } from "./inks";
import { PackagingStripe } from "./packaging-stripe";
import { Select } from "./select";
import type { CategoryView, ReceiptView } from "./types";

interface ItemState {
  key: string;
  description: string;
  quantity: string;
  total: string;
  /** Undefined: follows the receipt's category. */
  categoryId?: string | null;
}

function parseMoney(value: string, currency: string): Money | null {
  if (!isCurrencyCode(currency)) return null;
  try {
    return Money.parse(value, currency as CurrencyCode);
  } catch {
    return null;
  }
}

/**
 * Check what the AI read, fix anything, optionally move items to other
 * categories, and save. The preview uses the same split rules as the server.
 */
export function ReceiptReview({
  receipt,
  categories,
  currencies,
  suggestedCategoryId,
  today,
}: {
  receipt: ReceiptView;
  categories: readonly CategoryView[];
  currencies: readonly string[];
  suggestedCategoryId: string | null;
  today: string;
}) {
  const [merchant, setMerchant] = useState(receipt.merchant);
  const [purchasedOn, setPurchasedOn] = useState(receipt.purchasedOn ?? today);
  const [currency, setCurrency] = useState(receipt.currency);
  const [total, setTotal] = useState(receipt.total ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(suggestedCategoryId);
  const [items, setItems] = useState<ItemState[]>(
    receipt.items.map((item) => ({ key: item.id, description: item.description, quantity: item.quantity, total: item.total })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const preview = useMemo(() => {
    const totalMoney = parseMoney(total, currency);
    if (!totalMoney || totalMoney.isZero() || totalMoney.isNegative()) return { parts: null, itemSum: null, gap: null };
    const parsed = items.map((item) => ({ id: item.key, total: parseMoney(item.total, currency) }));
    const valid = parsed.filter((p): p is { id: string; total: Money } => p.total !== null);
    const itemSum = valid.length ? sum(valid.map((p) => p.total), totalMoney.currency) : null;
    const assignments = new Map(
      items.filter((i) => i.categoryId !== undefined).map((i) => [i.key, i.categoryId ?? null]),
    );
    try {
      const parts = splitReceipt(totalMoney, valid, assignments, categoryId);
      return { parts, itemSum, gap: itemSum ? totalMoney.subtract(itemSum) : null };
    } catch (e) {
      return { parts: null, itemSum, gap: null, error: e instanceof Error ? e.message : null };
    }
  }, [items, total, currency, categoryId]);

  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveReviewedReceipt(receipt.id, {
        merchant,
        purchasedOn,
        currency,
        total,
        categoryId,
        items: items.map(({ description, quantity, total, categoryId }) => ({ description, quantity, total, categoryId })),
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  const parts = preview.parts;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Field label="Shop" htmlFor="merchant">
          <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date" htmlFor="purchasedOn">
            <Input id="purchasedOn" type="date" value={purchasedOn} max={today} onChange={(e) => setPurchasedOn(e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Total paid" htmlFor="total">
          <Input id="total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className="text-2xl font-extrabold" placeholder="0.00" />
        </Field>
      </div>

      <CategoryPickerControlled categories={categories} value={categoryId} onChange={setCategoryId} />

      <section aria-labelledby="items-heading" className="grid gap-2">
        <div>
          <h2 id="items-heading" className="text-xl font-extrabold">
            Items
          </h2>
          <p className="text-sm text-muted">Move an item to another category to split the receipt.</p>
        </div>
        <ul className="grid">
          {items.map((item, index) => {
            const itemCategory = item.categoryId === undefined ? categoryId : item.categoryId;
            const ink = inkFor(itemCategory ? byId.get(itemCategory)?.color : null);
            const negative = item.total.trim().startsWith("-");
            return (
              <li key={item.key} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-x-2 gap-y-1.5 border-t border-rule py-2.5">
                <label className="sr-only" htmlFor={`desc-${item.key}`}>
                  Item {index + 1}
                </label>
                <input
                  id={`desc-${item.key}`}
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  className="min-w-0 border-b-2 border-transparent bg-transparent py-1 font-bold outline-none focus:border-ink"
                />
                <label className="sr-only" htmlFor={`total-${item.key}`}>
                  Price of item {index + 1}
                </label>
                <input
                  id={`total-${item.key}`}
                  value={item.total}
                  inputMode="decimal"
                  onChange={(e) => updateItem(item.key, { total: e.target.value })}
                  className="min-w-0 border-b-2 border-transparent bg-transparent py-1 text-right font-extrabold outline-none focus:border-ink"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.description || `item ${index + 1}`}`}
                  onClick={() => setItems((current) => current.filter((i) => i.key !== item.key))}
                  className="grid size-8 place-items-center hover:bg-wash"
                >
                  <X aria-hidden className="size-4" strokeWidth={2.5} />
                </button>
                <div className="col-span-3 flex items-center gap-2">
                  {negative ? (
                    <span className="text-[13px] font-semibold text-muted">Discount, shared across the receipt</span>
                  ) : (
                    <label className="flex items-center gap-2 text-[13px] text-muted">
                      <span className="sr-only">Category for {item.description}</span>
                      <select
                        value={itemCategory ?? ""}
                        onChange={(e) => updateItem(item.key, { categoryId: e.target.value || null })}
                        className={cn("appearance-none px-2 py-1 text-[13px] font-bold lowercase", ink.bg, ink.text)}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="">uncategorised</option>
                      </select>
                      {item.categoryId !== undefined && item.categoryId !== categoryId && <span>moved</span>}
                    </label>
                  )}
                  {item.quantity !== "1" && <span className="ml-auto text-[13px] text-muted">× {item.quantity}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          className="justify-self-start px-0 hover:bg-transparent hover:underline"
          onClick={() => setItems((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: "1", total: "" }])}
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          Add an item
        </Button>
        {preview.itemSum && preview.gap && !preview.gap.isZero() && (
          <p className="text-sm text-muted">
            Items add up to {preview.itemSum.format()}. The {preview.gap.abs().format()} difference (discounts, tax or
            lines the scan missed) is shared across categories in proportion.
          </p>
        )}
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 grid gap-3 border-t-2 border-ink bg-paper px-4 py-3 lg:bottom-0 lg:mx-0 lg:px-0">
        {parts && (
          <PackagingStripe
            label="How this receipt splits"
            segments={parts.map((part) => ({
              color: (part.categoryId ? byId.get(part.categoryId)?.color : null) ?? null,
              share: part.amount.minor / parts.reduce((total, p) => total + p.amount.minor, 0),
              label: (part.categoryId ? byId.get(part.categoryId)?.name : null) ?? "Uncategorised",
            }))}
          />
        )}
        {parts && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-bold">Saves as</span>
            {parts.map((part) => {
              const category = part.categoryId ? byId.get(part.categoryId) : undefined;
              const ink = inkFor(category?.color ?? null);
              return (
                <span key={part.categoryId ?? "none"} className={cn("px-2 py-1 font-bold", ink.bg, ink.text)}>
                  <span className="lowercase">{category?.name ?? "uncategorised"}</span> {part.amount.format()}
                </span>
              );
            })}
          </div>
        )}
        {(error ?? ("error" in preview ? preview.error : null)) && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error ?? ("error" in preview ? preview.error : null)}
          </p>
        )}
        <Button onClick={save} disabled={pending || !parts} aria-busy={pending}>
          {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
          {parts && parts.length > 1 ? `Save as ${parts.length} expenses` : "Save expense"}
        </Button>
      </div>
    </div>
  );
}

/** The receipt-wide category, as a controlled radio group of ink labels. */
function CategoryPickerControlled({
  categories,
  value,
  onChange,
}: {
  categories: readonly CategoryView[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div
      onChange={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.name === "receipt-category") onChange(target.value || null);
      }}
    >
      <CategoryPicker name="receipt-category" legend="File it under" categories={categories} defaultValue={value} />
    </div>
  );
}

