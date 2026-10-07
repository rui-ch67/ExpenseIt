import type { CategoryColor } from "@/domain/category";
import { cn } from "./cn";
import { inkFor } from "./inks";

/** A category name printed on its ink, like an own-brand label band. */
export function CategoryTag({
  name,
  color,
  size = "md",
  className,
}: {
  name: string | null;
  color: CategoryColor | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const ink = inkFor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold lowercase leading-none whitespace-nowrap",
        size === "sm" ? "px-1.5 py-1 text-[11px]" : "px-2 py-1.5 text-[13px]",
        ink.bg,
        ink.text,
        className,
      )}
    >
      {name ?? "uncategorised"}
    </span>
  );
}
