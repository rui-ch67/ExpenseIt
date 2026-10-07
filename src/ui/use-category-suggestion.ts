"use client";

import { useState } from "react";
import { type CategorySuggestion, suggestCategory, type TitleHabit } from "@/domain/category-suggestion";
import type { CategoryView } from "./types";

/**
 * Picks a category as the title is typed, until the user picks one
 * themselves. Without `habits` (editing an existing expense) it never
 * suggests and just holds the choice.
 */
export function useCategorySuggestion(
  categories: readonly CategoryView[],
  habits: readonly TitleHabit[] | undefined,
  initial: string | null,
) {
  const [categoryId, setCategoryId] = useState(initial ?? "");
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [chosenByHand, setChosenByHand] = useState(false);

  const name = categories.find((c) => c.id === suggestion?.categoryId)?.name.toLowerCase();
  const hint = !habits
    ? undefined
    : suggestion && name
      ? `Suggested ${name}, ${suggestion.basis === "history" ? "from your past spending" : "from the name"}. Pick another if it's wrong.`
      : "";

  return {
    categoryId,
    hint,
    onTitleChange(title: string) {
      if (!habits || chosenByHand) return;
      const next = suggestCategory(title, habits, categories);
      setSuggestion(next);
      setCategoryId(next?.categoryId ?? "");
    },
    choose(id: string) {
      setCategoryId(id);
      setChosenByHand(true);
      setSuggestion(null);
    },
  };
}
