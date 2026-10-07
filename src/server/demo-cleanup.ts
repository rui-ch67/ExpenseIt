import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { ImageStore } from "@/application/ports";
import type { Database } from "@/infrastructure/db/client";
import { receipts, users } from "@/infrastructure/db/schema";

export const DEMO_LIFETIME_HOURS = 24;

/**
 * Deletes demo accounts older than a day. Their expenses, categories,
 * receipts and sessions go with them through ON DELETE CASCADE; their
 * receipt photos live outside the database, so they're removed first.
 * Returns how many accounts were removed.
 */
export async function cleanupDemoAccounts(
  db: Database,
  images: ImageStore,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - DEMO_LIFETIME_HOURS * 60 * 60 * 1000);
  const expired = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAnonymous, true), lt(users.createdAt, cutoff)));
  if (expired.length === 0) return 0;

  const ids = expired.map((u) => u.id);
  const photos = await db
    .select({ path: receipts.imagePath })
    .from(receipts)
    .where(and(inArray(receipts.userId, ids), isNotNull(receipts.imagePath)));
  await images.delete(photos.map((p) => p.path!));

  await db.delete(users).where(inArray(users.id, ids));
  return ids.length;
}
