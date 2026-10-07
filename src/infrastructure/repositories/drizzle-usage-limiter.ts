import { and, eq, gt, sql } from "drizzle-orm";
import type { UsageLimiter } from "@/application/ports";
import type { IsoDate } from "@/domain/dates";
import type { Database } from "../db/client";
import { usageCounters } from "../db/schema";

export class DrizzleUsageLimiter implements UsageLimiter {
  constructor(private readonly db: Database) {}

  /**
   * A single atomic statement: insert the day's counter at 1, or add 1 if it
   * is still under the limit. Two scans racing each other can't both slip
   * past the limit, because Postgres serialises the conflicting upsert.
   */
  async tryConsume(key: string, day: IsoDate, limit: number): Promise<boolean> {
    if (limit <= 0) return false;
    const rows = await this.db
      .insert(usageCounters)
      .values({ key, day, count: 1 })
      .onConflictDoUpdate({
        target: [usageCounters.key, usageCounters.day],
        set: { count: sql`${usageCounters.count} + 1` },
        setWhere: sql`${usageCounters.count} < ${limit}`,
      })
      .returning({ count: usageCounters.count });
    return rows.length > 0;
  }

  async used(key: string, day: IsoDate): Promise<number> {
    const [row] = await this.db
      .select({ count: usageCounters.count })
      .from(usageCounters)
      .where(and(eq(usageCounters.key, key), eq(usageCounters.day, day)));
    return row?.count ?? 0;
  }

  /** Gives back a use that didn't happen (e.g. the scan failed before OCR). */
  async release(key: string, day: IsoDate): Promise<void> {
    await this.db
      .update(usageCounters)
      .set({ count: sql`${usageCounters.count} - 1` })
      .where(and(eq(usageCounters.key, key), eq(usageCounters.day, day), gt(usageCounters.count, 0)));
  }
}
