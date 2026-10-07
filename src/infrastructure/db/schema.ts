/**
 * ExpenseIt's own tables. Compared with the v1 Room database:
 * - money is stored as integer minor units (`bigint`), not REAL or text;
 * - dates are calendar dates (`date`), not epoch milliseconds;
 * - deleting a category sets its expenses to uncategorised instead of
 *   cascading the delete;
 * - every row belongs to a user, and deleting the user removes everything.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth-schema";

export * from "./auth-schema";

const ownerId = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const minorUnits = (name: string) => bigint(name, { mode: "number" });

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  homeCurrency: varchar("home_currency", { length: 3 }).notNull(),
  ...timestamps,
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    name: varchar("name", { length: 40 }).notNull(),
    color: varchar("color", { length: 16 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_user_name_unique").on(t.userId, sql`lower(${t.name})`),
    index("categories_user_order_idx").on(t.userId, t.sortOrder),
  ],
);

export const receiptStatus = pgEnum("receipt_status", ["processing", "ready", "failed"]);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    status: receiptStatus("status").notNull(),
    merchant: varchar("merchant", { length: 120 }).notNull().default(""),
    purchasedOn: date("purchased_on", { mode: "string" }),
    currency: varchar("currency", { length: 3 }).notNull(),
    totalMinor: minorUnits("total_minor"),
    imagePath: text("image_path"),
    suggestedCategoryId: uuid("suggested_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    extraction: jsonb("extraction"),
    ...timestamps,
  },
  (t) => [index("receipts_user_created_idx").on(t.userId, t.createdAt.desc(), t.id)],
);

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: varchar("description", { length: 200 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    totalMinor: minorUnits("total_minor").notNull(),
  },
  (t) => [index("receipt_items_receipt_idx").on(t.receiptId, t.position)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    title: varchar("title", { length: 120 }).notNull(),
    note: text("note").notNull().default(""),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    receiptId: uuid("receipt_id").references(() => receipts.id, { onDelete: "set null" }),
    spentOn: date("spent_on", { mode: "string" }).notNull(),
    amountMinor: minorUnits("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    homeAmountMinor: minorUnits("home_amount_minor").notNull(),
    homeCurrency: varchar("home_currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 20, scale: 10 }).notNull(),
    fxRateDate: date("fx_rate_date", { mode: "string" }).notNull(),
    ...timestamps,
  },
  (t) => [
    // Serves the newest-first list and its keyset pagination.
    index("expenses_user_spent_idx").on(t.userId, t.spentOn.desc(), t.createdAt.desc(), t.id),
    index("expenses_user_category_idx").on(t.userId, t.categoryId),
    index("expenses_receipt_idx").on(t.receiptId),
  ],
);

/** Cache of published exchange rates, keyed by the date that was asked for. */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    base: varchar("base", { length: 3 }).notNull(),
    quote: varchar("quote", { length: 3 }).notNull(),
    requestedOn: date("requested_on", { mode: "string" }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
    publishedOn: date("published_on", { mode: "string" }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.requestedOn] })],
);

/** Daily counters behind the scan limits (one row per key per day). */
export const usageCounters = pgTable(
  "usage_counters",
  {
    key: varchar("key", { length: 100 }).notNull(),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.day] })],
);
