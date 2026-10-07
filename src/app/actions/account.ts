"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ValidationError } from "@/domain/errors";
import { getDb } from "@/infrastructure/db/client";
import { VercelBlobImageStore } from "@/infrastructure/storage/vercel-blob-image-store";
import { type ActionResult, runAction } from "@/server/actions";
import { getAuth } from "@/server/auth-instance";
import { deleteUsers } from "@/server/demo-cleanup";
import { requireUser } from "@/server/session";

/**
 * Deletes the signed-in account and everything in it, photos included.
 * The confirmation phrase guards against a stray tap.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    if (confirmation.trim().toLowerCase() !== "delete") {
      throw new ValidationError('Type "delete" to confirm');
    }
    await getAuth().api.signOut({ headers: await headers() }).catch(() => undefined);
    await deleteUsers(getDb(), new VercelBlobImageStore(), [user.id]);
    return undefined;
  });
  if (!result.ok) return result;
  redirect("/");
}
