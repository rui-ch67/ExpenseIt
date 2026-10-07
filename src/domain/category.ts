import { ValidationError } from "./errors";

/**
 * Category colours are stored as palette names, not hex values, so the
 * design system decides what "teal" looks like in light and dark mode.
 */
export const CATEGORY_COLORS = [
  "slate",
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "fuchsia",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface Category {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly color: CategoryColor;
  readonly sortOrder: number;
}

/** The starter set every new account gets, carried over from v1. */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: CategoryColor }> = [
  { name: "Food", color: "orange" },
  { name: "Grocery", color: "lime" },
  { name: "Transport", color: "indigo" },
  { name: "Shopping", color: "amber" },
  { name: "Bills", color: "violet" },
  { name: "Entertainment", color: "fuchsia" },
  { name: "Health", color: "teal" },
  { name: "Education", color: "sky" },
  { name: "Other", color: "slate" },
];

export const CATEGORY_NAME_MAX_LENGTH = 40;

export function normaliseCategoryName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    throw new ValidationError("Category name can't be empty");
  }
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`,
    );
  }
  return trimmed;
}

export function parseCategoryColor(value: string): CategoryColor {
  if ((CATEGORY_COLORS as readonly string[]).includes(value)) {
    return value as CategoryColor;
  }
  throw new ValidationError(`Unknown category colour: ${value}`);
}
