import { cn } from "./cn";
import { inkFor } from "./inks";
import type { Segment } from "./types";

/**
 * The packaging stripe: one band split by where the money went. It recurs at
 * every scale (home, receipts, recaps). Segments under 1% still get a sliver
 * so small categories never vanish.
 */
export function PackagingStripe({
  segments,
  className,
  label = "Spending by category",
}: {
  segments: readonly Segment[];
  className?: string;
  label?: string;
}) {
  const visible = segments.filter((s) => s.share > 0);
  return (
    <div
      role="img"
      aria-label={`${label}: ${visible.map((s) => `${s.label} ${Math.round(s.share * 100)}%`).join(", ")}`}
      className={cn("flex h-3 w-full gap-px bg-ink ring-2 ring-ink", className)}
    >
      {visible.length === 0 ? (
        <span className="flex-1 bg-wash" />
      ) : (
        visible.map((s, i) => (
          <span
            key={`${s.label}-${i}`}
            className={inkFor(s.color).bg}
            style={{ flexGrow: Math.max(s.share, 0.01), flexBasis: 0 }}
          />
        ))
      )}
    </div>
  );
}
