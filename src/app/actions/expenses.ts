"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstDayOf, lastDayOf, parseYearMonth } from "@/domain/dates";
import { type ActionResult, runAction } from "@/server/actions";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { categoryMap, toExpenseView } from "@/server/views";
import type { ExpenseView } from "@/ui/types";

export interface ExpenseFilters {
  readonly q?: string;
  readonly category?: string;
  readonly month?: string;
}

/** The filter set shared by the Activity page and its "Load more" button. */
function toQuery(filters: ExpenseFilters) {
  const month = filters.month ? parseYearMonth(filters.month) : null;
  return {
    search: filters.q,
    categoryIds: filters.category ? [filters.category] : undefined,
    from: month ? firstDayOf(month) : undefined,
    to: month ? lastDayOf(month) : undefined,
  };
}

export async function listExpenses(
  filters: ExpenseFilters,
  cursor?: string,
): Promise<ActionResult<{ items: ExpenseView[]; nextCursor: string | null }>> {
  const user = await requireUser();
  return runAction(async () => {
    const { expenses, categories } = getServices();
    const [page, list] = await Promise.all([
      expenses.list(user.id, { ...toQuery(filters), limit: 30, cursor }),
      categories.list(user.id),
    ]);
    const byId = categoryMap(list);
    return { items: page.items.map((e) => toExpenseView(e, byId)), nextCursor: page.nextCursor };
  });
}

/** Create or update, from the expense form. Redirects on success. */
export async function saveExpense(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "") || null;
  const input = {
    title: String(form.get("title") ?? ""),
    amount: String(form.get("amount") ?? ""),
    currency: String(form.get("currency") ?? ""),
    spentOn: String(form.get("spentOn") ?? ""),
    categoryId: String(form.get("categoryId") ?? "") || null,
    note: String(form.get("note") ?? ""),
  };
  const result = await runAction(async () => {
    const { expenses } = getServices();
    if (id) await expenses.update(user.id, id, input);
    else await expenses.log(user.id, input);
    return undefined;
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect(id ? "/activity" : "/home");
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(() => getServices().expenses.delete(user.id, id));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/activity");
}
