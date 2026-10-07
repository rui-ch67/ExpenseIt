import { beforeEach, describe, expect, it } from "vitest";
import { parseIsoDate } from "@/domain/dates";
import { LimitReachedError, ServiceUnavailableError } from "@/domain/errors";
import { Money } from "@/domain/money";
import type { ExtractedReceipt } from "@/domain/receipt";
import { NotAReceiptError } from "@/infrastructure/ocr/receipt-schema";
import { createServices, type Services } from "@/server/container";
import {
  createTestDb,
  createUser,
  FakeExchangeRates,
  FixedClock,
  MemoryImageStore,
  ScriptedExtractor,
  TINY_JPEG,
} from "@/test/helpers";
import { toReceiptImage } from "./receipt-image";

const gbp = (amount: string) => Money.parse(amount, "GBP");

/** The test receipt from src/test/fixtures, as Gemini reads it. */
const grocer: ExtractedReceipt = {
  merchant: "Harbour Street Grocer",
  purchasedOn: parseIsoDate("2026-09-14"),
  currency: "GBP",
  total: gbp("24.11"),
  items: [
    { description: "Sourdough loaf", quantity: "1", total: gbp("2.40") },
    { description: "Semi skimmed milk", quantity: "1", total: gbp("1.25") },
    { description: "Free range eggs x12", quantity: "1", total: gbp("3.10") },
    { description: "Bananas loose", quantity: "0.845", total: gbp("0.76") },
    { description: "Cheddar 400g", quantity: "2", total: gbp("7.00") },
    { description: "Multibuy saving", quantity: "1", total: gbp("-1.50") },
    { description: "Thick bleach 750ml", quantity: "1", total: gbp("1.15") },
    { description: "Kitchen roll 4pk", quantity: "1", total: gbp("4.20") },
    { description: "Dishwasher tabs 30", quantity: "1", total: gbp("5.75") },
  ],
};

let services: Services;
let extractor: ScriptedExtractor;
let images: MemoryImageStore;
const alice = { id: "alice", isDemo: false };
const visitor = { id: "visitor", isDemo: true };
const photo = toReceiptImage(TINY_JPEG);

beforeEach(async () => {
  const db = await createTestDb();
  extractor = new ScriptedExtractor();
  images = new MemoryImageStore();
  services = createServices(db, {
    exchangeRates: new FakeExchangeRates({ "EUR→GBP": "0.86" }),
    clock: new FixedClock("2026-10-07"),
    receiptExtractor: extractor,
    imageStore: images,
  });
  for (const user of [alice, visitor]) {
    await createUser(db, user.id, user.isDemo);
    await services.accountSetup.setUp({ id: user.id });
  }
});

describe("scanning", () => {
  it("stores the photo privately and fills in the receipt", async () => {
    extractor.willReturn(grocer);
    const { receipt, problem } = await services.receipts.scan(alice, photo);

    expect(problem).toBeNull();
    expect(receipt).toMatchObject({ status: "ready", merchant: "Harbour Street Grocer", purchasedOn: "2026-09-14" });
    expect(receipt.total?.format()).toBe("£24.11");
    expect(receipt.items.map((i) => i.quantity)).toContain("0.845");
    expect(receipt.imagePath).toMatch(/^receipts\/alice\/[\w-]+\.jpg$/);
    expect(images.files.has(receipt.imagePath!)).toBe(true);
  });

  it("discards photos that aren't receipts", async () => {
    extractor.willReturn(new NotAReceiptError());
    await expect(services.receipts.scan(alice, photo)).rejects.toThrow("doesn't look like a receipt");
    expect(images.files.size).toBe(0);
    expect((await services.receipts.list(alice.id)).items).toHaveLength(0);
  });

  it("keeps the photo when OCR is down, and can rescan it later", async () => {
    extractor.willReturn(new ServiceUnavailableError("Receipt scanning is busy right now."), grocer);
    const first = await services.receipts.scan(alice, photo);
    expect(first.receipt.status).toBe("failed");
    expect(first.problem).toBe("Receipt scanning is busy right now.");
    expect(images.files.size).toBe(1);

    const second = await services.receipts.rescan(alice, first.receipt.id);
    expect(second.receipt.status).toBe("ready");
    expect(second.receipt.id).toBe(first.receipt.id);
  });

  it("limits demo visitors to 5 scans a day", async () => {
    extractor.willReturn(...Array(6).fill(grocer));
    for (let i = 0; i < 5; i++) await services.receipts.scan(visitor, photo);
    await expect(services.receipts.scan(visitor, photo)).rejects.toThrow(LimitReachedError);
    // Nothing was uploaded or sent to OCR for the refused scan.
    expect(extractor.calls).toBe(5);
    expect(images.files.size).toBe(5);
  });
});

describe("saving as expenses", () => {
  it("saves an unsplit receipt as one expense of the full total", async () => {
    extractor.willReturn(grocer);
    const { receipt } = await services.receipts.scan(alice, photo);
    const [grocery] = (await services.categories.list(alice.id)).filter((c) => c.name === "Grocery");

    const [expense, ...rest] = await services.receipts.saveAsExpenses(alice.id, receipt.id, {
      categoryId: grocery.id,
    });
    expect(rest).toHaveLength(0);
    expect(expense).toMatchObject({ title: "Harbour Street Grocer", spentOn: "2026-09-14", receiptId: receipt.id });
    expect(expense.amount.format()).toBe("£24.11");
    expect(expense.note).toContain("Sourdough loaf");
  });

  it("splits household items into their own expense, sharing the discount", async () => {
    extractor.willReturn(grocer);
    const { receipt } = await services.receipts.scan(alice, photo);
    const categories = await services.categories.list(alice.id);
    const grocery = categories.find((c) => c.name === "Grocery")!;
    const household = await services.categories.create(alice.id, { name: "Household", color: "teal" });
    const householdItems = receipt.items.filter((i) => /bleach|kitchen|dishwasher/i.test(i.description));

    const expenses = await services.receipts.saveAsExpenses(alice.id, receipt.id, {
      categoryId: grocery.id,
      itemCategories: Object.fromEntries(householdItems.map((i) => [i.id, household.id])),
    });

    // Food £14.51 and household £11.10 before the £1.50 saving. Household's
    // share is 1.50 × 11.10 / 25.61 = £0.65, food's £0.85; together £24.11.
    expect(expenses.map((e) => [e.title, e.amount.toDecimalString()])).toEqual([
      ["Harbour Street Grocer · Grocery", "13.66"],
      ["Harbour Street Grocer · Household", "10.45"],
    ]);
    expect(expenses[1].note).toBe("Thick bleach 750ml, Kitchen roll 4pk, Dishwasher tabs 30");
  });

  it("won't save the same receipt twice", async () => {
    extractor.willReturn(grocer);
    const { receipt } = await services.receipts.scan(alice, photo);
    await services.receipts.saveAsExpenses(alice.id, receipt.id, { categoryId: null });
    await expect(
      services.receipts.saveAsExpenses(alice.id, receipt.id, { categoryId: null }),
    ).rejects.toThrow("already saved as an expense");
  });

  it("converts receipts from abroad into the home currency", async () => {
    const eur = (amount: string) => Money.parse(amount, "EUR");
    extractor.willReturn({
      merchant: "Café de Flore",
      purchasedOn: parseIsoDate("2026-09-18"),
      currency: "EUR",
      total: eur("18.50"),
      items: [{ description: "Café crème", quantity: "2", total: eur("18.50") }],
    });
    const { receipt } = await services.receipts.scan(alice, photo);
    const [expense] = await services.receipts.saveAsExpenses(alice.id, receipt.id, { categoryId: null });
    expect(expense.amount.format()).toBe("€18.50");
    expect(expense.homeAmount.format()).toBe("£15.91");
  });
});

describe("reviewing and deleting", () => {
  it("saves corrections from the review screen", async () => {
    extractor.willReturn({ ...grocer, total: null, purchasedOn: null });
    const { receipt } = await services.receipts.scan(alice, photo);
    const fixed = await services.receipts.update(alice.id, receipt.id, {
      merchant: "Harbour St Grocer",
      purchasedOn: "2026-09-14",
      currency: "GBP",
      total: "24.11",
      items: [{ description: "Groceries", total: "24.11" }],
    });
    expect(fixed.merchant).toBe("Harbour St Grocer");
    expect(fixed.items).toHaveLength(1);
    expect(fixed.items[0].quantity).toBe("1");
  });

  it("deletes the photo with the receipt but keeps the expense", async () => {
    extractor.willReturn(grocer);
    const { receipt } = await services.receipts.scan(alice, photo);
    const [expense] = await services.receipts.saveAsExpenses(alice.id, receipt.id, { categoryId: null });

    await services.receipts.delete(alice.id, receipt.id);
    expect(images.files.size).toBe(0);
    const kept = await services.expenses.get(alice.id, expense.id);
    expect(kept.receiptId).toBeNull();
  });

  it("keeps receipts and photos private to their owner", async () => {
    extractor.willReturn(grocer);
    const { receipt } = await services.receipts.scan(alice, photo);
    await expect(services.receipts.get(visitor.id, receipt.id)).rejects.toThrow("Receipt not found");
    await expect(services.receipts.photo(visitor.id, receipt.id)).rejects.toThrow("not found");
    await expect(
      services.receipts.saveAsExpenses(visitor.id, receipt.id, { categoryId: null }),
    ).rejects.toThrow("not found");
    await expect(services.receipts.delete(visitor.id, receipt.id)).rejects.toThrow("not found");
  });
});
