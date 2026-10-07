import { getDb } from "@/infrastructure/db/client";
import { VercelBlobImageStore } from "@/infrastructure/storage/vercel-blob-image-store";
import { cleanupDemoAccounts } from "@/server/demo-cleanup";

/**
 * Called daily by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`, so nobody else can trigger it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const deleted = await cleanupDemoAccounts(getDb(), new VercelBlobImageStore());
  return Response.json({ deleted });
}
