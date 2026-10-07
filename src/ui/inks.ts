import type { CategoryColor } from "@/domain/category";

/**
 * Each category ink with the text colour that reads on it at ≥4.5:1.
 * Class names are written out in full so Tailwind can find them.
 */
export const INKS: Record<CategoryColor, { bg: string; text: string; hex: string; onDark: boolean }> = {
  slate: { bg: "bg-cat-slate", text: "text-white", hex: "#5b6170", onDark: true },
  rose: { bg: "bg-cat-rose", text: "text-ink", hex: "#ff5468", onDark: false },
  orange: { bg: "bg-cat-orange", text: "text-ink", hex: "#ff7a1a", onDark: false },
  amber: { bg: "bg-cat-amber", text: "text-ink", hex: "#ffc530", onDark: false },
  lime: { bg: "bg-cat-lime", text: "text-ink", hex: "#b6f23a", onDark: false },
  emerald: { bg: "bg-cat-emerald", text: "text-ink", hex: "#22b35e", onDark: false },
  teal: { bg: "bg-cat-teal", text: "text-ink", hex: "#12a594", onDark: false },
  sky: { bg: "bg-cat-sky", text: "text-ink", hex: "#3aa8f0", onDark: false },
  indigo: { bg: "bg-cat-indigo", text: "text-white", hex: "#3b4bf5", onDark: true },
  violet: { bg: "bg-cat-violet", text: "text-white", hex: "#6a4bd8", onDark: true },
  fuchsia: { bg: "bg-cat-fuchsia", text: "text-ink", hex: "#ff3d8b", onDark: false },
};

/** Uncategorised spending prints in plain ink. */
export const NO_CATEGORY_INK = { bg: "bg-ink", text: "text-white", hex: "#111111", onDark: true };

export function inkFor(color: CategoryColor | null | undefined) {
  return color ? INKS[color] : NO_CATEGORY_INK;
}
