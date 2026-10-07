import { twMerge } from "tailwind-merge";

/**
 * Joins class names, skipping falsy values. When two classes set the same
 * thing (`px-4` from a component, `px-3` passed in), the later one wins, so a
 * `className` prop reliably overrides a component's defaults.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
