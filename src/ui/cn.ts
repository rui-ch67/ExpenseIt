import { extendTailwindMerge } from "tailwind-merge";

// In Tailwind v4 an explicit `leading-*` beats the line height a `text-*`
// size brings with it, whatever the order. tailwind-merge would instead drop
// `leading-none` when a size follows it, so that conflict is switched off.
const merge = extendTailwindMerge({
  override: { conflictingClassGroups: { "font-size": [] } },
});

/**
 * Joins class names, skipping falsy values. When two classes set the same
 * thing (`px-4` from a component, `px-3` passed in), the later one wins, so a
 * `className` prop reliably overrides a component's defaults.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return merge(classes.filter(Boolean).join(" "));
}
