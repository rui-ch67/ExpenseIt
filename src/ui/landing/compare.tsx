"use client";

import { ChevronsLeftRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../cn";
import { useReducedMotion } from "../use-reduced-motion";

/**
 * Drag to compare: the "after" layer is revealed from the divider rightwards.
 * The handle is a real slider (arrow keys, Home/End, touch and mouse).
 */
export function Compare({
  before,
  after,
  min,
  max,
  initial,
  handleTop = 50,
  className,
}: {
  before: ReactNode;
  after: ReactNode;
  /** Divider limits and start, in % of the width. */
  min: number;
  max: number;
  initial: number;
  /** Vertical position of the handle, in % of the height. */
  handleTop?: number;
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initial);
  const [nudged, setNudged] = useState(false);
  const reducedMotion = useReducedMotion();
  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  // One small nudge on first view, so it's obvious the divider moves.
  useEffect(() => {
    if (reducedMotion || nudged) return;
    const timers = [
      setTimeout(() => setPosition(clamp(initial + 7)), 900),
      setTimeout(() => {
        setPosition(initial);
        setNudged(true);
      }, 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, nudged, initial, clamp]);

  function fromPointer(clientX: number) {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    setNudged(true);
    setPosition(clamp(((clientX - box.left) / box.width) * 100));
  }

  const animate = !nudged && !reducedMotion;

  return (
    <div ref={stage} className={cn("relative overflow-hidden select-none", className)}>
      <div className="absolute inset-0">{before}</div>
      <div
        className={cn("absolute inset-0", animate && "transition-[clip-path] duration-700 ease-out-expo")}
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        {after}
      </div>
      <div
        className={cn("absolute inset-y-0 z-10 w-1 -translate-x-1/2 bg-ink", animate && "transition-[left] duration-700 ease-out-expo")}
        style={{ left: `${position}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare a pile of receipts with the month they become"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(((position - min) / (max - min)) * 100)}% receipts`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 3;
            const moves: Record<string, number> = { ArrowLeft: -step, ArrowRight: step, Home: -100, End: 100 };
            if (e.key in moves) {
              e.preventDefault();
              setNudged(true);
              setPosition((p) => clamp(p + moves[e.key]));
            }
          }}
          style={{ top: `${handleTop}%` }}
          className="absolute left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center border-[3px] border-ink bg-paper focus-visible:outline-offset-4"
        >
          <ChevronsLeftRight aria-hidden className="size-6" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
