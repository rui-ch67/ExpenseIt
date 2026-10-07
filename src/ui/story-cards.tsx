import Link from "next/link";
import type { ReactNode } from "react";
import type { CategoryColor } from "@/domain/category";
import { cn } from "./cn";
import { inkFor } from "./inks";

/**
 * The signature: the month told as story cards. Each card is one fact on a
 * flat field of its category's ink. Cards snap-scroll sideways on phones.
 */
export function StoryRail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="mt-3">
      <ul className="scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 lg:scroll-px-0 lg:px-0 lg:[&>li:nth-child(n+5)]:hidden">
        {children}
      </ul>
    </section>
  );
}

export function StoryCard({
  color,
  tone,
  tag,
  href,
  children,
}: {
  color?: CategoryColor | null;
  tone?: "ink" | "outline";
  /** A category name, printed as its label band. Other cards carry no label. */
  tag?: string;
  href?: string;
  children: ReactNode;
}) {
  const ink = color !== undefined ? inkFor(color) : null;
  const surface =
    tone === "ink"
      ? "bg-ink text-white"
      : tone === "outline"
        ? "bg-paper text-ink ring-2 ring-inset ring-ink"
        : cn(ink?.bg, ink?.text);
  const body = (
    <>
      {tag && (
        <span className="self-start bg-ink px-1.5 py-1 text-xs leading-none font-extrabold text-white lowercase">
          {tag}
        </span>
      )}
      <span className="mt-auto grid gap-1.5">{children}</span>
    </>
  );
  const className = cn(
    "flex h-[9.5rem] w-[9.5rem] flex-col p-3 no-underline lg:h-40 lg:w-full",
    surface,
    href && "transition-transform duration-200 ease-out-expo hover:-translate-y-0.5",
  );
  return (
    <li className="shrink-0 snap-start lg:min-w-0 lg:flex-1" data-surface={tone === "ink" || ink?.onDark ? "dark" : "light"}>
      {href ? (
        <Link href={href} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}
