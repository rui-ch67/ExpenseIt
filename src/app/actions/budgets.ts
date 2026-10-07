"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, runAction } from "@/server/actions";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";

async function run(body: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    await body(user.id);
    return undefined;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Sets a monthly budget; `categoryId` null is the overall budget. */
export async function setBudget(categoryId: string | null, amount: string) {
  return run((userId) => getServices().budgets.set(userId, categoryId, amount));
}

export async function removeBudget(id: string) {
  return run((userId) => getServices().budgets.remove(userId, id));
}
