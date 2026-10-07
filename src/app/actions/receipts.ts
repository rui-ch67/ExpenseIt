"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, runAction } from "@/server/actions";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";

export interface ReviewedReceipt {
  readonly merchant: string;
  readonly purchasedOn: string;
  readonly currency: string;
  readonly total: string;
  /** Category for every item not given its own. */
  readonly categoryId: string | null;
  readonly items: ReadonlyArray<{
    description: string;
    quantity: string;
    total: string;
    /** `undefined` follows the receipt's category. */
    categoryId?: string | null;
  }>;
}

/**
 * Saves the user's corrections, then turns the receipt into expenses: one,
 * or one per category when items were moved. Item categories travel by
 * position, because saving corrections replaces the item rows.
 */
export async function saveReviewedReceipt(receiptId: string, review: ReviewedReceipt): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    const { receipts } = getServices();
    const updated = await receipts.update(user.id, receiptId, review);
    const itemCategories: Record<string, string | null> = {};
    review.items.forEach((item, index) => {
      const saved = updated.items[index];
      if (saved && item.categoryId !== undefined && item.categoryId !== review.categoryId) {
        itemCategories[saved.id] = item.categoryId;
      }
    });
    await receipts.saveAsExpenses(user.id, receiptId, { categoryId: review.categoryId, itemCategories });
    return undefined;
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect(`/receipts/${receiptId}?saved=1`);
}

export async function rescanReceipt(receiptId: string): Promise<ActionResult<{ problem: string | null }>> {
  const user = await requireUser();
  const result = await runAction(async () => {
    const { problem } = await getServices().receipts.rescan(user, receiptId);
    return { problem };
  });
  revalidatePath(`/receipts/${receiptId}`);
  return result;
}

export async function deleteReceipt(receiptId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(() => getServices().receipts.delete(user.id, receiptId));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/receipts");
}
