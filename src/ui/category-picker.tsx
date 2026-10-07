import type { ReactNode } from "react";
import { cn } from "./cn";
import { inkFor } from "./inks";
import type { CategoryView } from "./types";

/**
 * Categories as a radio group of ink labels. Pass `value` and `onChange` to
 * control the choice (for suggestions), or `defaultValue` to leave it to the form.
 */
export function CategoryPicker({
  name,
  categories,
  defaultValue = null,
  value,
  onChange,
  legend = "Category",
  hint,
}: {
  name: string;
  categories: readonly CategoryView[];
  defaultValue?: string | null;
  /** The chosen category id, "" for uncategorised. */
  value?: string;
  onChange?: (id: string) => void;
  legend?: string;
  /** Shown under the labels and announced politely, e.g. why one was picked. */
  hint?: ReactNode;
}) {
  const options = [...categories.map((c) => ({ id: c.id, name: c.name, color: c.color })), { id: "", name: "Uncategorised", color: null }];
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const ink = inkFor(option.color);
          return (
            <label key={option.id || "none"} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={option.id}
                {...(value === undefined
                  ? { defaultChecked: (defaultValue ?? "") === option.id }
                  : { checked: value === option.id, onChange: () => onChange?.(option.id) })}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-2 text-sm font-bold lowercase ring-ink ring-offset-2 transition-shadow peer-checked:ring-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink",
                  option.color ? cn(ink.bg, ink.text) : "border-2 border-dashed border-ink bg-paper text-ink",
                )}
              >
                {option.name}
              </span>
            </label>
          );
        })}
      </div>
      {hint !== undefined && (
        <p className="min-h-5 text-sm text-muted" aria-live="polite">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
