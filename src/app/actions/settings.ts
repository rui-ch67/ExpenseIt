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

export async function changeHomeCurrency(currency: string) {
  return run((userId) => getServices().settings.changeHomeCurrency(userId, currency));
}

export async function createCategory(input: { name: string; color: string }) {
  return run((userId) => getServices().categories.create(userId, input));
}

export async function updateCategory(id: string, input: { name?: string; color?: string }) {
  return run((userId) => getServices().categories.update(userId, id, input));
}

export async function deleteCategory(id: string) {
  return run((userId) => getServices().categories.delete(userId, id));
}

export async function reorderCategories(orderedIds: string[]) {
  return run((userId) => getServices().categories.reorder(userId, orderedIds));
}
