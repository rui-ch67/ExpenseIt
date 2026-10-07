"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, runAction } from "@/server/actions";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";

export async function saveRecurring(_previous: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "") || null;
  const input = {
    title: String(form.get("title") ?? ""),
    amount: String(form.get("amount") ?? ""),
    currency: String(form.get("currency") ?? ""),
    frequency: String(form.get("frequency") ?? ""),
    startsOn: String(form.get("startsOn") ?? ""),
    endsOn: String(form.get("endsOn") ?? "") || null,
    categoryId: String(form.get("categoryId") ?? "") || null,
    note: String(form.get("note") ?? ""),
  };
  const result = await runAction(async () => {
    const { recurring } = getServices();
    if (id) await recurring.update(user.id, id, input);
    else await recurring.create(user.id, input);
    return undefined;
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/recurring");
}

export async function setRecurringPaused(id: string, paused: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    await getServices().recurring.setPaused(user.id, id, paused);
    return undefined;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(() => getServices().recurring.delete(user.id, id));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/recurring");
}
