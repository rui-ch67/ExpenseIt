"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { INPUT } from "./field";
import { formatMonth } from "./format";
import { Select } from "./select";
import type { CategoryView } from "./types";

/** Search, category and month filters, kept in the URL so results can be shared and reloaded. */
export function ActivityFilters({
  categories,
  months,
}: {
  categories: readonly CategoryView[];
  months: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  // Search as you type, a moment after the last keystroke.
  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", query.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = params.get("q") || params.get("category") || params.get("month");

  return (
    <div className="grid gap-2 px-4 lg:px-0" aria-busy={pending}>
      <label className="relative block">
        <span className="sr-only">Search expenses</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" strokeWidth={2.5} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by place or note"
          className={`${INPUT} pl-9`}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="sr-only">Category</span>
          <Select value={params.get("category") ?? ""} onChange={(e) => update("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">Uncategorised</option>
          </Select>
        </label>
        <label>
          <span className="sr-only">Month</span>
          <Select value={params.get("month") ?? ""} onChange={(e) => update("month", e.target.value)}>
            <option value="">Any time</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {active && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex items-center gap-1 justify-self-start text-sm font-bold underline underline-offset-4"
        >
          <X aria-hidden className="size-4" strokeWidth={2.5} />
          Clear filters
        </button>
      )}
    </div>
  );
}
