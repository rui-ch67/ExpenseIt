import { describe, expect, it } from "vitest";
import { habitsFrom, matchKey, suggestCategory, type TitleUse } from "./category-suggestion";
import type { IsoDate } from "./dates";

const categories = [
  { id: "food", name: "Food" },
  { id: "grocery", name: "Grocery" },
  { id: "transport", name: "Transport" },
  { id: "bills", name: "Bills" },
  { id: "treats", name: "Treats" },
];

const use = (title: string, categoryId: string, uses: number, lastSpentOn = "2026-10-01"): TitleUse => ({
  title,
  categoryId,
  uses,
  lastSpentOn: lastSpentOn as IsoDate,
});

describe("matchKey", () => {
  it("ignores case, accents and punctuation", () => {
    expect(matchKey("  Sainsbury's  Local ")).toBe("sainsbury s local");
    expect(matchKey("Café de Flore")).toBe("cafe de flore");
    expect(matchKey("M&S Food")).toBe("m and s food");
  });
});

describe("habitsFrom", () => {
  it("keeps each title's most used category, most used titles first", () => {
    const habits = habitsFrom([
      use("Tesco", "grocery", 2),
      use("Pret", "food", 9),
      use("TESCO", "treats", 1),
      use("tesco", "grocery", 3),
    ]);
    expect(habits).toEqual([
      { key: "pret", categoryId: "food" },
      { key: "tesco", categoryId: "grocery" },
    ]);
  });

  it("breaks a tie with the category used most recently", () => {
    const habits = habitsFrom([use("Boots", "food", 2, "2026-08-01"), use("Boots", "treats", 2, "2026-09-30")]);
    expect(habits[0].categoryId).toBe("treats");
  });
});

describe("suggestCategory", () => {
  const habits = habitsFrom([use("Tesco", "treats", 4), use("Costa Coffee", "food", 3), use("The Gym", "bills", 1)]);

  it("prefers the user's own habit over the built-in list", () => {
    expect(suggestCategory("tesco", habits, categories)).toEqual({ categoryId: "treats", basis: "history" });
  });

  it("recognises the same place written differently, and titles being typed", () => {
    expect(suggestCategory("Tesco Express", habits, categories)?.categoryId).toBe("treats");
    expect(suggestCategory("Cos", habits, categories)?.categoryId).toBe("food");
    expect(suggestCategory("the gym, monthly", habits, categories)?.categoryId).toBe("bills");
  });

  it("falls back to common places and bills when there's no history", () => {
    expect(suggestCategory("Lidl", [], categories)).toEqual({ categoryId: "grocery", basis: "common" });
    expect(suggestCategory("Train to Brighton", [], categories)?.categoryId).toBe("transport");
    expect(suggestCategory("Council tax", [], categories)?.categoryId).toBe("bills");
  });

  it("matches whole words only", () => {
    expect(suggestCategory("EE", [], categories)?.categoryId).toBe("bills");
    expect(suggestCategory("Coffee beans", [], categories)?.categoryId).toBe("food");
    expect(suggestCategory("Sweets", [], categories)).toBeNull();
  });

  it("only suggests categories the user still has", () => {
    const noBills = categories.filter((c) => c.id !== "bills");
    expect(suggestCategory("Rent", [], noBills)).toBeNull();
    expect(suggestCategory("the gym", habits, noBills)).toBeNull();
  });

  it("waits for something to go on", () => {
    expect(suggestCategory("t", habits, categories)).toBeNull();
    expect(suggestCategory("", habits, categories)).toBeNull();
  });
});
