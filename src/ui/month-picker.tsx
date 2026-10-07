"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn";
import { formatMonth } from "./format";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const SHORT_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/**
 * The month label in the month switcher. Tapping it opens a year of months
 * to jump straight to, instead of stepping back one month at a time.
 */
export function MonthPicker({
  month,
  current,
  basePath,
  tone,
}: {
  month: string;
  current: string;
  basePath: string;
  tone: "ink" | "white";
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const currentYear = Number(current.slice(0, 4));
  const href = (m: string) => (m === current ? basePath : `${basePath}?month=${m}`);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>("[aria-current=date]")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const yearArrow =
    "grid size-9 place-items-center border-2 border-ink hover:bg-wash aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent";
  // aria-disabled rather than disabled, so the button keeps focus when it runs out of years.
  const atLatestYear = year >= currentYear;

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        // Only when focus moves somewhere else; outside taps are handled above.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={`${formatMonth(month)}. Choose a month`}
        onClick={() => {
          setYear(Number(month.slice(0, 4)));
          setOpen((wasOpen) => !wasOpen);
        }}
        className={cn(
          "flex h-9 items-center gap-1.5 border-2 pr-2 pl-3 text-sm font-bold transition-colors duration-150",
          tone === "white" ? "border-white hover:bg-white/15" : "border-ink hover:bg-wash",
        )}
      >
        {formatMonth(month)}
        <ChevronDown
          aria-hidden
          className={cn("size-4 transition-transform duration-200 ease-out-expo", open && "rotate-180")}
          strokeWidth={2.5}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a month"
          data-surface="light"
          className="absolute top-full right-0 z-40 mt-2 w-[17.5rem] border-2 border-ink bg-paper p-3 text-ink"
        >
          <div className="flex items-center justify-between">
            <button type="button" className={yearArrow} onClick={() => setYear(year - 1)} aria-label={`Show ${year - 1}`}>
              <ChevronLeft aria-hidden className="size-4" strokeWidth={2.5} />
            </button>
            <p className="text-lg font-extrabold" aria-live="polite">
              {year}
            </p>
            <button
              type="button"
              className={yearArrow}
              onClick={() => !atLatestYear && setYear(year + 1)}
              aria-disabled={atLatestYear}
              aria-label={`Show ${year + 1}`}
            >
              <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-1.5">
            {MONTHS.map((mm) => {
              const value = `${year}-${mm}`;
              const label = SHORT_MONTH.format(new Date(`${value}-01T00:00:00Z`));
              const cell = "flex h-10 items-center justify-center border-2 text-sm font-bold";
              if (value > current) {
                return (
                  <li key={mm}>
                    <span aria-disabled className={cn(cell, "border-transparent text-muted opacity-50")}>
                      {label}
                    </span>
                  </li>
                );
              }
              const selected = value === month;
              return (
                <li key={mm}>
                  <Link
                    href={href(value)}
                    prefetch={false}
                    aria-current={selected ? "date" : undefined}
                    aria-label={formatMonth(value)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      cell,
                      "no-underline transition-colors duration-150",
                      selected
                        ? "border-ink bg-ink text-white"
                        : value === current
                          ? "border-ink hover:bg-wash"
                          : "border-transparent hover:bg-wash",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
