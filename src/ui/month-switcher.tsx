import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addMonths, type YearMonth } from "@/domain/dates";
import { cn } from "./cn";
import { formatMonth } from "./format";
import { MonthPicker } from "./month-picker";

/** Previous and next month as plain links (?month=YYYY-MM), with a picker on the month itself. */
export function MonthSwitcher({
  month,
  current,
  basePath,
  tone = "ink",
}: {
  month: YearMonth;
  current: YearMonth;
  basePath: string;
  tone?: "ink" | "white";
}) {
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);
  const href = (m: YearMonth) => (m === current ? basePath : `${basePath}?month=${m}`);
  const edge = tone === "white" ? "border-white" : "border-ink";
  const arrow = cn("grid size-9 place-items-center border-2 no-underline", edge);

  return (
    <nav aria-label="Month" className="flex items-center gap-1.5">
      <Link href={href(previous)} className={arrow} aria-label={`Show ${formatMonth(previous)}`}>
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2.5} />
      </Link>
      <MonthPicker month={month} current={current} basePath={basePath} tone={tone} />
      {next <= current ? (
        <Link href={href(next)} className={arrow} aria-label={`Show ${formatMonth(next)}`}>
          <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden>
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </span>
      )}
    </nav>
  );
}
