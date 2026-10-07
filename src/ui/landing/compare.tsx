"use client";

import { ChevronsLeftRight, ChevronsUpDown } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../cn";
import { useReducedMotion } from "../use-reduced-motion";

/**
 * Drag to compare. The "after" layer is revealed from the divider onwards:
 * rightwards when horizontal (desktop), downwards when vertical (phones,
 * where each side needs the full width). The handle is a real slider:
 * arrow keys, Home/End, touch and mouse.
 */
export function Compare({
  before,
  after,
  min,
  max,
  initial,
  orientation = "horizontal",
  handleAt = 50,
  className,
}: {
  before: ReactNode;
  after: ReactNode;
  /** Divider limits and start, in % along the drag axis. */
  min: number;
  max: number;
  initial: number;
  orientation?: "horizontal" | "vertical";
  /** Where the handle sits along the divider, in %. */
  handleAt?: number;
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initial);
  const [nudged, setNudged] = useState(false);
  const reducedMotion = useReducedMotion();
  const vertical = orientation === "vertical";
  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  // One small nudge on first view, so it's obvious the divider moves.
  useEffect(() => {
    if (reducedMotion || nudged) return;
    const timers = [
      setTimeout(() => setPosition(clamp(initial + (vertical ? -10 : 7))), 900),
      setTimeout(() => {
        setPosition(initial);
        setNudged(true);
      }, 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, nudged, initial, clamp, vertical]);

  function fromPointer(clientX: number, clientY: number) {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    setNudged(true);
    const fraction = vertical ? (clientY - box.top) / box.height : (clientX - box.left) / box.width;
    setPosition(clamp(fraction * 100));
  }

  const animate = !nudged && !reducedMotion;
  const Icon = vertical ? ChevronsUpDown : ChevronsLeftRight;
  const keyMoves = (step: number): Record<string, number> =>
    vertical
      ? { ArrowUp: -step, ArrowDown: step, ArrowLeft: -step, ArrowRight: step, Home: -100, End: 100 }
      : { ArrowLeft: -step, ArrowRight: step, ArrowDown: -step, ArrowUp: step, Home: -100, End: 100 };

  return (
    <div ref={stage} className={cn("relative overflow-hidden select-none", className)}>
      <div className="absolute inset-0">{before}</div>
      <div
        className={cn("absolute inset-0", animate && "transition-[clip-path] duration-700 ease-out-expo")}
        style={{ clipPath: vertical ? `inset(${position}% 0 0 0)` : `inset(0 0 0 ${position}%)` }}
      >
        {after}
      </div>
      <div
        className={cn(
          "absolute z-10 bg-ink",
          vertical ? "inset-x-0 h-1 -translate-y-1/2" : "inset-y-0 w-1 -translate-x-1/2",
          animate && (vertical ? "transition-[top] duration-700 ease-out-expo" : "transition-[left] duration-700 ease-out-expo"),
        )}
        style={vertical ? { top: `${position}%` } : { left: `${position}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare a pile of receipts with the month they become"
          aria-orientation={orientation}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(((position - min) / (max - min)) * 100)}% receipts`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX, e.clientY);
          }}
          onKeyDown={(e) => {
            const moves = keyMoves(e.shiftKey ? 10 : 3);
            if (e.key in moves) {
              e.preventDefault();
              setNudged(true);
              setPosition((p) => clamp(p + moves[e.key]));
            }
          }}
          style={vertical ? { left: `${handleAt}%` } : { top: `${handleAt}%` }}
          className={cn(
            "absolute grid size-14 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center border-[3px] border-ink bg-paper focus-visible:outline-offset-4",
            vertical ? "top-1/2 cursor-ns-resize" : "left-1/2 cursor-ew-resize",
          )}
        >
          <Icon aria-hidden className="size-6" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
