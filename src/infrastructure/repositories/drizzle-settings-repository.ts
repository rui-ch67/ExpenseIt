import { eq } from "drizzle-orm";
import type { SettingsRepository, UserSettings } from "@/application/ports";
import { parseCurrencyCode } from "@/domain/currency";
import type { Database } from "../db/client";
import { userSettings } from "../db/schema";

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(userId: string): Promise<UserSettings | null> {
    const [row] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return row ? { userId: row.userId, homeCurrency: parseCurrencyCode(row.homeCurrency) } : null;
  }

  async save(settings: UserSettings): Promise<void> {
    await this.db
      .insert(userSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { homeCurrency: settings.homeCurrency, updatedAt: new Date() },
      });
  }
}
