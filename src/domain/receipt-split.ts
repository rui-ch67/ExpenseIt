import { ValidationError } from "./errors";
import { Money, sum } from "./money";

export interface SplitItem {
  readonly id: string;
  readonly total: Money;
}

export interface SplitPart {
  /** `null` means uncategorised. */
  readonly categoryId: string | null;
  readonly amount: Money;
  readonly itemIds: readonly string[];
}

/**
 * Turns one receipt into one expense per category.
 *
 * Each product line goes to the category it was assigned (or the default).
 * Everything that isn't a product line (discount rows with negative totals,
 * tax added at the till, or lines the OCR missed) is the gap between the
 * receipt total and the sum of the products. That gap is shared out in
 * proportion to each category's products, so the parts always add up to
 * exactly the receipt total.
 *
 * Example: £16 of food, £4 of bleach, a −£2 discount, £18 paid. Bleach moved
 * to Household → Food £14.40, Household £3.60.
 */
export function splitReceipt(
  total: Money,
  items: readonly SplitItem[],
  assignments: ReadonlyMap<string, string | null>,
  defaultCategoryId: string | null,
): SplitPart[] {
  if (total.isZero() || total.isNegative()) {
    throw new ValidationError("The receipt total must be more than zero");
  }

  const products = items.filter((item) => !item.total.isNegative() && !item.total.isZero());
  const groups = new Map<string | null, SplitItem[]>([[defaultCategoryId, []]]);
  for (const item of products) {
    const category = assignments.has(item.id) ? assignments.get(item.id)! : defaultCategoryId;
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  const used = [...groups].filter(([, groupItems]) => groupItems.length > 0);

  // Nothing to split by: the whole receipt is one expense.
  if (used.length <= 1) {
    const [categoryId] = used[0] ?? [defaultCategoryId];
    return [{ categoryId, amount: total, itemIds: items.map((i) => i.id) }];
  }

  const groupSums = used.map(([, groupItems]) => sum(groupItems.map((i) => i.total), total.currency));
  const gap = total.subtract(sum(groupSums, total.currency));
  const shares = gap.allocate(groupSums.map((s) => s.minor));

  return used.map(([categoryId, groupItems], index) => {
    const amount = groupSums[index].add(shares[index]);
    if (amount.isZero() || amount.isNegative()) {
      throw new ValidationError(
        "After discounts, one of the categories would have nothing left to pay. Move more items into it or don't split this receipt.",
      );
    }
    return { categoryId, amount, itemIds: groupItems.map((i) => i.id) };
  });
}
