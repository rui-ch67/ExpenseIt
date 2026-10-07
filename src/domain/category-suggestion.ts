import type { IsoDate } from "./dates";

/**
 * Suggests a category for an expense typed in by hand, without AI: first from
 * the user's own habits (what they filed that place under before), then from
 * a short list of common UK shops and bills. It runs in the browser as the
 * title is typed, so it's instant and costs nothing.
 */

/** A title the user has used, and the category they file it under most. */
export interface TitleHabit {
  /** The title as `matchKey` normalises it. */
  readonly key: string;
  readonly categoryId: string;
}

/** How often one title was filed under one category. */
export interface TitleUse {
  readonly title: string;
  readonly categoryId: string;
  readonly uses: number;
  readonly lastSpentOn: IsoDate;
}

export interface CategorySuggestion {
  readonly categoryId: string;
  /** "history": the user's own past expenses; "common": the built-in list. */
  readonly basis: "history" | "common";
}

/** "Sainsbury's Local" → "sainsbury s local"; "M&S" → "m and s"; "Café" → "cafe". */
export function matchKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Turns per-title usage into one habit per title (its most used category,
 * the most recent on a tie), most used titles first.
 */
export function habitsFrom(uses: readonly TitleUse[], limit = 300): TitleHabit[] {
  const byKey = new Map<string, { best: TitleUse; total: number }>();
  for (const use of uses) {
    const key = matchKey(use.title);
    if (!key) continue;
    const entry = byKey.get(key);
    if (!entry) {
      byKey.set(key, { best: use, total: use.uses });
      continue;
    }
    entry.total += use.uses;
    const better =
      use.uses > entry.best.uses || (use.uses === entry.best.uses && use.lastSpentOn > entry.best.lastSpentOn);
    if (better) entry.best = use;
  }
  return [...byKey.entries()]
    .sort(([, a], [, b]) => b.total - a.total || b.best.lastSpentOn.localeCompare(a.best.lastSpentOn))
    .slice(0, limit)
    .map(([key, { best }]) => ({ key, categoryId: best.categoryId }));
}

/**
 * Common places and bills, keyed by the starter category names. Matched as
 * whole words, so "ee" means the network, not every word containing "ee".
 * Only used when the user still has a category of that name.
 */
const COMMON: ReadonlyArray<readonly [category: string, keywords: readonly string[]]> = [
  ["grocery", ["tesco", "sainsbury", "asda", "morrisons", "aldi", "lidl", "waitrose", "co op", "iceland", "ocado", "m and s food", "spar", "budgens", "grocery", "groceries", "supermarket"]],
  ["food", ["pret", "greggs", "costa", "starbucks", "caffe nero", "nando", "mcdonald", "kfc", "burger king", "subway", "wagamama", "pizza", "domino", "deliveroo", "just eat", "uber eats", "five guys", "itsu", "wasabi", "cafe", "coffee", "restaurant", "takeaway", "lunch", "dinner", "breakfast", "brunch", "pub"]],
  ["transport", ["uber", "bolt", "tfl", "oyster", "train", "trainline", "rail", "railcard", "bus", "coach", "national express", "megabus", "tube", "taxi", "petrol", "fuel", "parking", "eurostar", "flight", "ryanair", "easyjet"]],
  ["shopping", ["amazon", "ebay", "argos", "ikea", "primark", "uniqlo", "zara", "h and m", "asos", "john lewis", "tk maxx", "clothes", "shoes"]],
  ["bills", ["rent", "council tax", "electricity", "energy bill", "octopus", "british gas", "edf", "eon", "water bill", "thames water", "broadband", "phone bill", "phone plan", "giffgaff", "ee", "vodafone", "o2", "virgin media", "insurance", "tv licence"]],
  ["entertainment", ["netflix", "spotify", "disney", "prime video", "apple music", "youtube premium", "cinema", "odeon", "vue", "cineworld", "steam", "playstation", "xbox", "nintendo", "concert", "gig", "ticketmaster", "theatre", "museum", "bowling"]],
  ["health", ["boots", "superdrug", "pharmacy", "chemist", "gym", "puregym", "nuffield", "dentist", "doctor", "prescription", "physio", "optician", "specsavers"]],
  ["education", ["udemy", "coursera", "waterstones", "textbook", "tuition", "course", "university", "stationery"]],
];

const NOT_A_NAME = new Set(["the", "a", "an", "my", "and"]);

/** The first word that names the place: "the gym" → "gym". */
function leadWord(key: string): string | undefined {
  return key.split(" ").find((word) => word.length >= 3 && !NOT_A_NAME.has(word));
}

export function suggestCategory(
  title: string,
  habits: readonly TitleHabit[],
  categories: ReadonlyArray<{ readonly id: string; readonly name: string }>,
): CategorySuggestion | null {
  const key = matchKey(title);
  if (key.length < 2) return null;

  const known = new Set(categories.map((c) => c.id));
  const usable = habits.filter((h) => known.has(h.categoryId));
  const fromHistory = (habit: TitleHabit | undefined): CategorySuggestion | null =>
    habit ? { categoryId: habit.categoryId, basis: "history" } : null;

  // The exact title they've used before.
  const exact = fromHistory(usable.find((h) => h.key === key));
  if (exact) return exact;

  if (key.length >= 3) {
    // The same place written differently ("tesco express" after "tesco"),
    // or the start of a title they've used, while they're still typing.
    const lead = leadWord(key);
    const similar = fromHistory(
      (lead && usable.find((h) => leadWord(h.key) === lead)) || usable.find((h) => h.key.startsWith(key)),
    );
    if (similar) return similar;
  }

  const padded = ` ${key} `;
  for (const [name, keywords] of COMMON) {
    const category = categories.find((c) => c.name.trim().toLowerCase() === name);
    if (category && keywords.some((keyword) => padded.includes(` ${keyword} `))) {
      return { categoryId: category.id, basis: "common" };
    }
  }
  return null;
}
