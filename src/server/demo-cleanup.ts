import { and, eq, lt } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema";

export const DEMO_LIFETIME_HOURS = 24;

/**
 * Deletes demo accounts older than a day. Their expenses, categories,
 * receipts and sessions go with them through ON DELETE CASCADE.
 * Returns how many accounts were removed.
 */
export async function cleanupDemoAccounts(db: Database, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DEMO_LIFETIME_HOURS * 60 * 60 * 1000);
  const deleted = await db
    .delete(users)
    .where(and(eq(users.isAnonymous, true), lt(users.createdAt, cutoff)))
    .returning({ id: users.id });
  return deleted.length;
}
