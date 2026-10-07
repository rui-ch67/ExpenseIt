"use client";

import { useEffect, useRef } from "react";
import { formatMinor } from "./format";

/**
 * Renders the final amount immediately (so it is never missing), then, the
 * first time it is seen in a session, counts up to it with an exponential
 * ease-out. Skipped entirely under reduced motion.
 */
export function CountUp({
  minor,
  currency,
  exponent = 2,
  storageKey,
}: {
  minor: number;
  currency: string;
  exponent?: number;
  storageKey: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatMinor(minor, currency, exponent);

  useEffect(() => {
    const node = ref.current;
    if (!node || minor === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Storage unavailable (private mode): just animate.
    }
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      node.textContent = formatMinor(Math.round(minor * eased), currency, exponent);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = final;
    };
  }, [minor, currency, exponent, storageKey, final]);

  return (
    <span ref={ref} aria-label={final}>
      {final}
    </span>
  );
}
