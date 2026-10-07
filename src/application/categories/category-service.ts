import {
  type Category,
  DEFAULT_CATEGORIES,
  normaliseCategoryName,
  parseCategoryColor,
} from "@/domain/category";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import type { CategoryRepository } from "../ports";

export interface CategoryInput {
  readonly name: string;
  readonly color: string;
}

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  list(userId: string): Promise<Category[]> {
    return this.categories.list(userId);
  }

  async get(userId: string, id: string): Promise<Category> {
    const category = await this.categories.findById(userId, id);
    if (!category) throw new NotFoundError("Category");
    return category;
  }

  async create(userId: string, input: CategoryInput): Promise<Category> {
    const name = normaliseCategoryName(input.name);
    const color = parseCategoryColor(input.color);
    await this.assertNameAvailable(userId, name);

    const existing = await this.categories.list(userId);
    return this.categories.create(userId, { name, color, sortOrder: existing.length });
  }

  async update(userId: string, id: string, input: Partial<CategoryInput>): Promise<Category> {
    const patch: { name?: string; color?: Category["color"] } = {};
    if (input.name !== undefined) {
      patch.name = normaliseCategoryName(input.name);
      await this.assertNameAvailable(userId, patch.name, id);
    }
    if (input.color !== undefined) {
      patch.color = parseCategoryColor(input.color);
    }
    const updated = await this.categories.update(userId, id, patch);
    if (!updated) throw new NotFoundError("Category");
    return updated;
  }

  /**
   * Deleting a category keeps its expenses; they become uncategorised.
   * (In v1 a database cascade deleted every expense in the category.)
   */
  async delete(userId: string, id: string): Promise<void> {
    const deleted = await this.categories.delete(userId, id);
    if (!deleted) throw new NotFoundError("Category");
  }

  async reorder(userId: string, orderedIds: readonly string[]): Promise<void> {
    const existing = await this.categories.list(userId);
    const known = new Set(existing.map((c) => c.id));
    const requested = new Set(orderedIds);
    const sameSet =
      requested.size === orderedIds.length &&
      requested.size === known.size &&
      orderedIds.every((id) => known.has(id));
    if (!sameSet) {
      throw new ValidationError("Reorder must list every category exactly once");
    }
    await this.categories.reorder(userId, orderedIds);
  }

  /** Gives a brand-new account the starter categories. Safe to call twice. */
  async createDefaults(userId: string): Promise<void> {
    const existing = await this.categories.list(userId);
    if (existing.length > 0) return;
    await this.categories.createMany(
      userId,
      DEFAULT_CATEGORIES.map((c, index) => ({ ...c, sortOrder: index })),
    );
  }

  private async assertNameAvailable(userId: string, name: string, exceptId?: string) {
    const clash = await this.categories.findByName(userId, name);
    if (clash && clash.id !== exceptId) {
      throw new ConflictError(`You already have a category called "${clash.name}"`);
    }
  }
}
