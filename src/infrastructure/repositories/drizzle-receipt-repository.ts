import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  NewReceipt,
  NewReceiptItem,
  Page,
  ReceiptPatch,
  ReceiptRepository,
} from "@/application/ports";
import type { Receipt } from "@/domain/receipt";
import type { Database } from "../db/client";
import { receiptItems, receipts } from "../db/schema";
import { decodeCursor, encodeCursor } from "./cursor";
import { toReceipt } from "./mappers";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

function itemRows(receiptId: string, items: readonly NewReceiptItem[]) {
  return items.map((item, position) => ({
    receiptId,
    position,
    description: item.description,
    quantity: item.quantity,
    totalMinor: item.total.minor,
  }));
}

export class DrizzleReceiptRepository implements ReceiptRepository {
  constructor(private readonly db: Database) {}

  async create(receipt: NewReceipt): Promise<Receipt> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(receipts)
        .values({
          userId: receipt.userId,
          status: receipt.status,
          merchant: receipt.merchant,
          purchasedOn: receipt.purchasedOn,
          currency: receipt.currency,
          totalMinor: receipt.total?.minor ?? null,
          imagePath: receipt.imagePath,
          suggestedCategoryId: receipt.suggestedCategoryId ?? null,
          extraction: receipt.extraction ?? null,
        })
        .returning();
      if (receipt.items.length > 0) {
        await tx.insert(receiptItems).values(itemRows(row.id, receipt.items));
      }
      return this.load(tx, receipt.userId, row.id) as Promise<Receipt>;
    });
  }

  findById(userId: string, id: string): Promise<Receipt | null> {
    return this.load(this.db, userId, id);
  }

  async list(userId: string, limit: number, cursor?: string): Promise<Page<Receipt>> {
    const conditions = [eq(receipts.userId, userId)];
    if (cursor) {
      const [createdAt, id] = decodeCursor(cursor, 2);
      conditions.push(
        sql`(${receipts.createdAt}, ${receipts.id}) < (${createdAt}::timestamptz, ${id}::uuid)`,
      );
    }
    const rows = await this.db
      .select()
      .from(receipts)
      .where(and(...conditions))
      .orderBy(desc(receipts.createdAt), desc(receipts.id))
      .limit(limit + 1);

    const pageRows = rows.slice(0, limit);
    const items =
      pageRows.length === 0
        ? []
        : await this.db
            .select()
            .from(receiptItems)
            .where(
              inArray(
                receiptItems.receiptId,
                pageRows.map((r) => r.id),
              ),
            )
            .orderBy(asc(receiptItems.position));

    const page = pageRows.map((row) =>
      toReceipt(
        row,
        items.filter((i) => i.receiptId === row.id),
      ),
    );
    const last = pageRows.at(-1);
    return {
      items: page,
      nextCursor:
        rows.length > limit && last ? encodeCursor([last.createdAt.toISOString(), last.id]) : null,
    };
  }

  async update(userId: string, id: string, patch: ReceiptPatch): Promise<Receipt | null> {
    return this.db.transaction(async (tx) => {
      const { items, total, ...fields } = patch;
      const [row] = await tx
        .update(receipts)
        .set({
          ...fields,
          ...(total !== undefined && { totalMinor: total?.minor ?? null }),
          updatedAt: new Date(),
        })
        .where(and(eq(receipts.userId, userId), eq(receipts.id, id)))
        .returning({ id: receipts.id });
      if (!row) return null;

      if (items) {
        await tx.delete(receiptItems).where(eq(receiptItems.receiptId, id));
        if (items.length > 0) await tx.insert(receiptItems).values(itemRows(id, items));
      }
      return this.load(tx, userId, id);
    });
  }

  async delete(userId: string, id: string): Promise<Receipt | null> {
    return this.db.transaction(async (tx) => {
      const existing = await this.load(tx, userId, id);
      if (!existing) return null;
      // Items cascade; linked expenses keep existing, unlinked.
      await tx.delete(receipts).where(and(eq(receipts.userId, userId), eq(receipts.id, id)));
      return existing;
    });
  }

  private async load(db: Database | Tx, userId: string, id: string): Promise<Receipt | null> {
    const [row] = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.userId, userId), eq(receipts.id, id)));
    if (!row) return null;
    const items = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id))
      .orderBy(asc(receiptItems.position));
    return toReceipt(row, items);
  }
}
