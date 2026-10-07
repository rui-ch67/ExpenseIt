import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { ImageStore } from "@/application/ports";
import type { Database } from "@/infrastructure/db/client";
import { receipts, users } from "@/infrastructure/db/schema";

export const DEMO_LIFETIME_HOURS = 24;

/**
 * Deletes users and everything they own. Expenses, categories, receipts,
 * budgets, recurring payments and sessions go through ON DELETE CASCADE;
 * receipt photos live outside the database, so they're removed first.
 */
export async function deleteUsers(db: Database, images: ImageStore, ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const photos = await db
    .select({ path: receipts.imagePath })
    .from(receipts)
    .where(and(inArray(receipts.userId, [...ids]), isNotNull(receipts.imagePath)));
  await images.delete(photos.map((p) => p.path!));
  const deleted = await db.delete(users).where(inArray(users.id, [...ids])).returning({ id: users.id });
  return deleted.length;
}

/** Deletes demo accounts older than a day. Returns how many were removed. */
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
  return deleteUsers(db, images, expired.map((u) => u.id));
}
