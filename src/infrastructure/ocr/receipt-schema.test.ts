import { describe, expect, it } from "vitest";
import { toReceiptImage } from "@/application/receipts/receipt-image";
import { NotAReceiptError, toExtractedReceipt } from "./receipt-schema";

const answer = {
  isReceipt: true,
  merchant: " Harbour Street Grocer ",
  date: "2026-09-14",
  currency: "gbp",
  total: "24.11",
  items: [
    { description: "Sourdough loaf", quantity: "1", total: "2.40" },
    { description: "Multibuy saving", quantity: "1", total: "-1.50" },
  ],
};

describe("toExtractedReceipt", () => {
  it("converts a good answer into exact amounts", () => {
    const receipt = toExtractedReceipt(answer, "EUR");
    expect(receipt.merchant).toBe("Harbour Street Grocer");
    expect(receipt.currency).toBe("GBP");
    expect(receipt.total?.minor).toBe(2411);
    expect(receipt.items.map((i) => i.total.minor)).toEqual([240, -150]);
  });

  it("keeps the suggested category only if it's one of the user's own", () => {
    expect(toExtractedReceipt({ ...answer, category: "grocery" }, "GBP", ["Food", "Grocery"]).suggestedCategory).toBe("Grocery");
    expect(toExtractedReceipt({ ...answer, category: "Snacks" }, "GBP", ["Food", "Grocery"]).suggestedCategory).toBeNull();
  });

  it("refuses images that aren't receipts", () => {
    expect(() => toExtractedReceipt({ ...answer, isReceipt: false }, "GBP")).toThrow(NotAReceiptError);
  });

  it("falls back to the home currency for currencies it can't convert", () => {
    const receipt = toExtractedReceipt({ ...answer, currency: "XYZ" }, "EUR");
    expect(receipt.currency).toBeNull();
    expect(receipt.total?.currency).toBe("EUR");
  });

  it("drops unreadable fields instead of failing the whole scan", () => {
    const receipt = toExtractedReceipt(
      {
        ...answer,
        date: "14/09/2026",
        total: "about a tenner",
        items: [
          { description: "Fine", quantity: "two", total: "1.00" },
          { description: "Broken", quantity: "1", total: "1.2.3" },
          { description: "   ", quantity: "1", total: "1.00" },
        ],
      },
      "GBP",
    );
    expect(receipt.purchasedOn).toBeNull();
    expect(receipt.total).toBeNull();
    expect(receipt.items).toEqual([expect.objectContaining({ description: "Fine", quantity: "1" })]);
  });

  it("rejects answers that don't match the schema at all", () => {
    expect(() => toExtractedReceipt({ hello: "world" }, "GBP")).toThrow();
  });
});

describe("toReceiptImage", () => {
  it("recognises images by their bytes, not their name", () => {
    expect(toReceiptImage(new Uint8Array([0xff, 0xd8, 0xff, 0xdb])).contentType).toBe("image/jpeg");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(toReceiptImage(webp).contentType).toBe("image/webp");
  });

  it("rejects other files and oversized photos", () => {
    expect(() => toReceiptImage(new TextEncoder().encode("%PDF-1.7"))).toThrow("JPEG, PNG or WebP");
    expect(() => toReceiptImage(new Uint8Array(0))).toThrow("empty");
    const huge = new Uint8Array(5 * 1024 * 1024);
    huge.set([0xff, 0xd8, 0xff]);
    expect(() => toReceiptImage(huge)).toThrow("too large");
  });
});
