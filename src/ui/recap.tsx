"use client";

import { Pause, Play, Share2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CategoryColor } from "@/domain/category";
import { cn } from "./cn";
import { inkFor } from "./inks";
import type { Segment } from "./types";
import { useReducedMotion } from "./use-reduced-motion";

export interface RecapStory {
  readonly id: string;
  /** Every story sits on a category ink; neighbouring stories never share one. */
  readonly ink: CategoryColor | null;
  /** Only for stories about one category: its name, printed as a label band. */
  readonly tag?: string;
  readonly headline: string;
  readonly lede: string;
  readonly rows?: ReadonlyArray<{ label: string; value: string }>;
  /** Which category this story is about; it stands tall in the month's stripe. */
  readonly focus?: CategoryColor | null | "all";
}

const STORY_MS = 6000;

function surface(ink: RecapStory["ink"]) {
  const category = inkFor(ink);
  return { className: cn(category.bg, category.text), dark: category.onDark };
}

/**
 * The month's packaging stripe at poster scale: widths are each category's
 * share; the category the story is about stands at full height, the rest
 * sit low, so every story shows where it fits in the month.
 */
function MonthSkyline({
  segments,
  focus,
  ground,
}: {
  segments: readonly Segment[];
  focus: RecapStory["focus"];
  ground: RecapStory["ink"];
}) {
  const visible = segments.filter((s) => s.share > 0);
  return (
    <div aria-hidden className="mt-auto flex h-[clamp(6rem,24vh,13rem)] items-end gap-[3px]">
      {visible.map((segment, i) => {
        const tall = focus === "all" || focus === undefined || segment.color === focus;
        // A column the same ink as the story's ground would vanish into it,
        // so it prints as paper inside its rule instead.
        const fill = segment.color === ground ? "bg-paper" : inkFor(segment.color).bg;
        return (
          <span
            key={`${segment.label}-${i}`}
            className={cn("block ring-2 ring-ink", fill)}
            style={{ flexGrow: Math.max(segment.share, 0.02), flexBasis: 0, height: tall ? "100%" : "34%" }}
          />
        );
      })}
    </div>
  );
}

/**
 * The month as a tap-through story. Tap the right side (or →) for the next
 * story, the left (or ←) to go back; Space pauses. Stories cut hard from
 * one ink to the next, with no fades.
 */
export function Recap({
  title,
  stories,
  segments,
  shareText,
}: {
  title: string;
  stories: readonly RecapStory[];
  segments: readonly Segment[];
  shareText: string;
}) {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  // Auto-advance starts off under reduced motion; the visitor can still press play.
  const [pausedChoice, setPausedChoice] = useState<boolean | null>(null);
  const paused = pausedChoice ?? reducedMotion;
  const togglePause = () => setPausedChoice(!paused);
  const [elapsed, setElapsed] = useState(0);
  const [shared, setShared] = useState<string | null>(null);
  const last = stories.length - 1;
  const story = stories[index];
  const look = surface(story.ink);

  const go = useCallback(
    (delta: number) => {
      setElapsed(0);
      setIndex((i) => Math.min(last, Math.max(0, i + delta)));
    },
    [last],
  );

  // Advance on a timer, unless paused or on the final story.
  useEffect(() => {
    if (paused || index === last) return;
    const started = performance.now() - elapsed;
    let frame = 0;
    const tick = (now: number) => {
      const t = now - started;
      if (t >= STORY_MS) {
        go(1);
        return;
      }
      setElapsed(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, index, last, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, paused]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShared("Copied. Paste it anywhere.");
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <main
      data-surface={look.dark ? "dark" : "light"}
      className={cn("fixed inset-0 flex flex-col overflow-hidden select-none", look.className)}
      aria-roledescription="story"
      aria-label={title}
    >
      <div className="flex gap-1 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {stories.map((s, i) => (
          <span key={s.id} className={cn("h-1 flex-1", look.dark ? "bg-white/30" : "bg-ink/20")}>
            <span
              className={cn("block h-full", look.dark ? "bg-white" : "bg-ink")}
              style={{
                width:
                  i < index
                    ? "100%"
                    : i === index
                      ? // With auto-advance off, the current story still shows as current.
                        `${index === last || reducedMotion ? 100 : Math.max((elapsed / STORY_MS) * 100, 4)}%`
                      : "0%",
              }}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pt-3 text-sm font-bold">
        <span>{title}</span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? "Play" : "Pause"}
            className="grid size-10 place-items-center"
          >
            {paused ? <Play aria-hidden className="size-5" strokeWidth={2.5} /> : <Pause aria-hidden className="size-5" strokeWidth={2.5} />}
          </button>
          <Link href="/insights" aria-label="Close" className="grid size-10 place-items-center">
            <X aria-hidden className="size-6" strokeWidth={2.5} />
          </Link>
        </span>
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-10 pb-8" aria-live="polite">
        {story.tag && (
          <span className="mb-6 self-start bg-ink px-2 py-1.5 text-[15px] leading-none font-extrabold text-white lowercase">
            {story.tag}
          </span>
        )}
        <p className="text-[clamp(3.25rem,17vw,6rem)] leading-[0.88] font-extrabold tracking-[-0.04em] break-words">
          {story.headline}
        </p>
        <p className="mt-5 text-[clamp(1.25rem,5.5vw,1.75rem)] leading-[1.15] font-bold">{story.lede}</p>
        {story.rows && story.rows.length > 0 && (
          <ul className={cn("mt-8 border-t-[3px]", look.dark ? "border-white" : "border-ink")}>
            {story.rows.map((row) => (
              <li key={row.label} className={cn("flex justify-between gap-4 border-b-2 py-3 text-lg font-bold", look.dark ? "border-white" : "border-ink")}>
                <span className="truncate">{row.label}</span>
                <span className="font-extrabold">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
        <MonthSkyline segments={segments} focus={story.focus} ground={story.ink} />
        {index === last && (
          <div className="relative z-10 mt-8 grid gap-2">
            <button type="button" onClick={share} className="flex items-center justify-center gap-2 border-2 border-ink bg-ink px-4 py-3 font-bold text-white">
              <Share2 aria-hidden className="size-5" strokeWidth={2.5} />
              Share my month
            </button>
            <Link href="/insights" className="flex items-center justify-center border-2 border-ink bg-paper px-4 py-3 font-bold text-ink no-underline">
              Back to insights
            </Link>
            {shared && <p role="status" className="text-center text-sm font-semibold">{shared}</p>}
          </div>
        )}
      </div>

      {/* Tap zones: left third goes back, the rest goes forward. */}
      {index !== last && (
        <>
          <button type="button" aria-label="Previous story" onClick={() => go(-1)} className="absolute top-24 bottom-0 left-0 w-1/3 cursor-w-resize opacity-0" />
          <button type="button" aria-label="Next story" onClick={() => go(1)} className="absolute top-24 right-0 bottom-0 w-2/3 cursor-e-resize opacity-0" />
        </>
      )}
      {index === last && index > 0 && (
        <button type="button" aria-label="Previous story" onClick={() => go(-1)} className="absolute top-24 left-0 h-1/3 w-1/4 cursor-w-resize opacity-0" />
      )}
    </main>
  );
}
