import { getDb } from "@/infrastructure/db/client";
import { VercelBlobImageStore } from "@/infrastructure/storage/vercel-blob-image-store";
import { cleanupDemoAccounts } from "@/server/demo-cleanup";
import { getServices } from "@/server/services";

/** Recurring payments can take a while to log for every user. */
export const maxDuration = 300;

/**
 * Daily housekeeping, called by Vercel Cron (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`: log recurring payments that fell
 * due, then delete expired demo accounts and their photos.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const logged = await getServices().recurring.catchUp();
  const deleted = await cleanupDemoAccounts(getDb(), new VercelBlobImageStore());
  return Response.json({ recurringLogged: logged, demoAccountsDeleted: deleted });
}
