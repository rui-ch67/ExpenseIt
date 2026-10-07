import { describe, expect, it } from "vitest";
import { Money, sum } from "./money";
import { splitReceipt } from "./receipt-split";

const gbp = (amount: string) => Money.parse(amount, "GBP");
const item = (id: string, amount: string) => ({ id, total: gbp(amount) });

const tesco = [item("bread", "6.00"), item("cheese", "10.00"), item("bleach", "4.00"), item("clubcard", "-2.00")];

describe("splitReceipt", () => {
  it("shares a discount in proportion to each category's items", () => {
    const parts = splitReceipt(gbp("18.00"), tesco, new Map([["bleach", "household"]]), "grocery");
    expect(parts.map((p) => [p.categoryId, p.amount.toDecimalString(), p.itemIds])).toEqual([
      ["grocery", "14.40", ["bread", "cheese"]],
      ["household", "3.60", ["bleach"]],
    ]);
  });

  it("always adds up to exactly the receipt total", () => {
    const items = [item("a", "3.33"), item("b", "3.33"), item("c", "3.34")];
    const parts = splitReceipt(
      gbp("9.01"),
      items,
      new Map([
        ["b", "x"],
        ["c", "y"],
      ]),
      null,
    );
    expect(sum(parts.map((p) => p.amount), "GBP").toDecimalString()).toBe("9.01");
  });

  it("spreads tax or missed lines the same way as discounts", () => {
    // Items add up to £10 but £12 was paid (e.g. US-style sales tax).
    const parts = splitReceipt(gbp("12.00"), [item("a", "7.50"), item("b", "2.50")], new Map([["b", "y"]]), "x");
    expect(parts.map((p) => p.amount.toDecimalString())).toEqual(["9.00", "3.00"]);
  });

  it("keeps an unsplit receipt as a single expense of the full total", () => {
    const parts = splitReceipt(gbp("18.00"), tesco, new Map(), "grocery");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ categoryId: "grocery" });
    expect(parts[0].amount.toDecimalString()).toBe("18.00");
  });

  it("uses the full total when there are no items at all", () => {
    const [part] = splitReceipt(gbp("5.00"), [], new Map(), null);
    expect(part.amount.toDecimalString()).toBe("5.00");
    expect(part.categoryId).toBeNull();
  });

  it("files everything under one category if every item is moved", () => {
    const all = new Map(tesco.map((i) => [i.id, "household"]));
    const parts = splitReceipt(gbp("18.00"), tesco, all, "grocery");
    expect(parts).toHaveLength(1);
    expect(parts[0].categoryId).toBe("household");
  });

  it("refuses a split that leaves a category with nothing to pay", () => {
    const items = [item("a", "1.00"), item("b", "9.00")];
    // Paid 1p for £10 of items: the £1 group's share of the discount wipes it out.
    expect(() => splitReceipt(gbp("0.01"), items, new Map([["a", "x"]]), "y")).toThrow(
      "nothing left to pay",
    );
  });
});
