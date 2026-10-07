import type { CategoryService } from "../categories/category-service";
import type { DemoSeeder } from "../demo/demo-seeder";
import type { SettingsService } from "../settings/settings-service";

/** Runs once when an account is created: settings, starter categories, demo data. */
export class AccountSetupService {
  constructor(
    private readonly settings: SettingsService,
    private readonly categories: CategoryService,
    private readonly demo: DemoSeeder,
  ) {}

  async setUp(user: { id: string; isAnonymous?: boolean | null }): Promise<void> {
    await this.settings.initialise(user.id);
    await this.categories.createDefaults(user.id);
    if (user.isAnonymous) {
      await this.demo.seed(user.id);
    }
  }
}
