import { cn } from "../cn";

/** A recap story at thumbnail scale, as the app shows it full screen. */
export function StoryPreview({
  ground,
  tag,
  headline,
  lede,
  focus,
  className,
}: {
  ground: string;
  tag?: string;
  headline: string;
  lede: string;
  /** Index of the stripe column standing tall, or -1 for all. */
  focus: number;
  className?: string;
}) {
  const columns = [
    { grow: 48, ink: "bg-cat-violet" },
    { grow: 15, ink: "bg-cat-lime" },
    { grow: 14, ink: "bg-cat-orange" },
    { grow: 9, ink: "bg-cat-indigo" },
    { grow: 7, ink: "bg-cat-amber" },
    { grow: 4, ink: "bg-cat-teal" },
    { grow: 3, ink: "bg-cat-fuchsia" },
  ];
  return (
    <figure className={cn("flex aspect-[9/16] flex-col p-4", ground, className)}>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-0.5 flex-1 bg-current opacity-40" />
        ))}
      </div>
      {tag && <span className="mt-6 self-start bg-ink px-1.5 py-1 text-[13px] leading-none font-extrabold text-white">{tag}</span>}
      <p className={cn("text-[2.5rem] leading-[0.9] font-extrabold tracking-[-0.04em]", tag ? "mt-3" : "mt-8")}>{headline}</p>
      <p className="mt-2 text-sm leading-snug font-bold">{lede}</p>
      <div aria-hidden className="mt-auto flex h-20 items-end gap-0.5">
        {columns.map((c, i) => (
          <span
            key={i}
            className={cn("block ring-[1.5px] ring-ink", ground.includes(c.ink.replace("bg-", "")) ? "bg-paper" : c.ink)}
            style={{ flexGrow: c.grow, flexBasis: 0, height: focus === -1 || focus === i ? "100%" : "34%" }}
          />
        ))}
      </div>
    </figure>
  );
}
