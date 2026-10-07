import { and, asc, eq, sql } from "drizzle-orm";
import type { CategoryRepository, NewCategory } from "@/application/ports";
import type { Category } from "@/domain/category";
import type { Database } from "../db/client";
import { categories } from "../db/schema";
import { toCategory } from "./mappers";

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string): Promise<Category[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
    return rows.map(toCategory);
  }

  async findById(userId: string, id: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, id)));
    return row ? toCategory(row) : null;
  }

  async findByName(userId: string, name: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.userId, userId), sql`lower(${categories.name}) = lower(${name})`),
      );
    return row ? toCategory(row) : null;
  }

  async create(userId: string, category: NewCategory): Promise<Category> {
    const [row] = await this.db
      .insert(categories)
      .values({ userId, ...category })
      .returning();
    return toCategory(row);
  }

  async createMany(userId: string, list: readonly NewCategory[]): Promise<void> {
    if (list.length === 0) return;
    await this.db.insert(categories).values(list.map((c) => ({ userId, ...c })));
  }

  async update(
    userId: string,
    id: string,
    patch: Partial<Pick<Category, "name" | "color">>,
  ): Promise<Category | null> {
    if (Object.keys(patch).length === 0) return this.findById(userId, id);
    const [row] = await this.db
      .update(categories)
      .set(patch)
      .where(and(eq(categories.userId, userId), eq(categories.id, id)))
      .returning();
    return row ? toCategory(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, id)))
      .returning({ id: categories.id });
    return deleted.length > 0;
  }

  async reorder(userId: string, orderedIds: readonly string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(categories)
          .set({ sortOrder: index })
          .where(and(eq(categories.userId, userId), eq(categories.id, id)));
      }
    });
  }
}
