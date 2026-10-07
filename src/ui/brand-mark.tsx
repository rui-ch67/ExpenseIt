import { cn } from "./cn";

/**
 * The ExpenseIt mark: a torn receipt whose item lines are printed in
 * category inks. This is the simplified artwork from
 * docs/brand/expenseit-mark-small.svg, which stays readable at 20 to 40px.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden focusable="false" className={cn("size-[1.2em] shrink-0", className)}>
      <rect width="512" height="512" className="fill-ink" />
      <polygon
        className="fill-paper"
        points="120,56 392,56 392,400 358,440 324,400 290,440 256,400 222,440 188,400 154,440 120,400"
      />
      <rect x="156" y="100" width="200" height="48" className="fill-cat-orange" />
      <rect x="156" y="172" width="136" height="48" className="fill-cat-lime" />
      <rect x="156" y="244" width="168" height="48" className="fill-cat-indigo" />
      <rect x="156" y="324" width="200" height="28" className="fill-ink" />
    </svg>
  );
}

/** The mark beside the name, sized by the surrounding font size. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-[0.4em]">
      <BrandMark />
      ExpenseIt
    </span>
  );
}
