/**
 * The JSON shape we ask the model to fill in, and the code that turns its
 * answer into a domain ExtractedReceipt.
 *
 * Amounts are requested as decimal *strings* ("12.50"), never JSON numbers,
 * so they go straight into Money.parse without a floating-point detour.
 */
import { z } from "zod";
import { type CurrencyCode, isCurrencyCode } from "@/domain/currency";
import { parseIsoDate } from "@/domain/dates";
import { ValidationError } from "@/domain/errors";
import { Money } from "@/domain/money";
import type { ExtractedReceipt } from "@/domain/receipt";

const AMOUNT = "^-?\\d+(\\.\\d{1,3})?$";

/** JSON Schema sent to the model as its required response format. */
export function receiptJsonSchema(categories: readonly string[]) {
  return {
  type: "object",
  properties: {
    category: {
      type: ["string", "null"],
      ...(categories.length > 0 && { enum: [...categories, null] }),
      description: "The single best category for the whole receipt, from the user's list, or null if none fits.",
    },
    isReceipt: {
      type: "boolean",
      description: "False if the image is not a purchase receipt or is unreadable.",
    },
    merchant: {
      type: ["string", "null"],
      description: "Shop or business name as printed at the top, in normal capitalisation.",
    },
    date: {
      type: ["string", "null"],
      description: "Purchase date as YYYY-MM-DD.",
    },
    currency: {
      type: ["string", "null"],
      description: "ISO 4217 code, e.g. GBP for £, EUR for €.",
    },
    total: {
      type: ["string", "null"],
      pattern: AMOUNT,
      description: "Final amount paid, after all discounts, as a decimal string.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,3})?$",
            description: "Units bought, or weight in kg for weighed items. \"1\" if not shown.",
          },
          total: {
            type: "string",
            pattern: AMOUNT,
            description: "Line total for this row. Negative for discounts and savings.",
          },
        },
        required: ["description", "quantity", "total"],
      },
    },
  },
  required: ["isReceipt", "merchant", "date", "currency", "total", "items", "category"],
  } as const;
}

export function receiptPrompt(categories: readonly string[]): string {
  const list = categories.length > 0 ? categories.map((c) => `"${c}"`).join(", ") : "none";
  return `${RECEIPT_PROMPT}
- Category: the user's categories are ${list}. Pick the one that fits the receipt as a whole (a supermarket shop is usually groceries), or null.`;
}

const RECEIPT_PROMPT = `You read photos of shop receipts for an expense tracker.
Fill in the JSON schema exactly. Rules:
- Merchant: the business name, not the address or a slogan. Use normal capitalisation (e.g. "Harbour Street Grocer").
- Date: receipts from the UK and Europe print dates day-first (14/09/2026 is 14 September 2026).
- Items: one entry per purchased product line, using the line's final price. Write descriptions in readable sentence case.
  When a line shows a multiplier or weight (e.g. "2 @ 3.50" or "0.845 kg @ 0.90/kg"), put the count or weight in quantity and the line total in total.
- Discounts, savings, coupons and promotions are their own items with negative totals.
- Do not include payment lines (card, cash, change), VAT/tax summaries, subtotals, loyalty points or card numbers as items.
- Total: the amount actually paid.
- If something is unreadable, use null rather than guessing. If this is not a receipt, set isReceipt to false.`;

const answerSchema = z.object({
  isReceipt: z.boolean(),
  category: z.string().nullable().optional(),
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  currency: z.string().nullable(),
  total: z.string().nullable(),
  items: z.array(
    z.object({ description: z.string(), quantity: z.string(), total: z.string() }),
  ),
});

export class NotAReceiptError extends ValidationError {
  constructor() {
    super("That doesn't look like a receipt. Try a clearer photo of the whole receipt.");
  }
}

function safely<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}

/**
 * Validates the model's answer and converts it. Anything malformed is
 * dropped to null (or the item skipped) rather than failing the whole scan:
 * the user reviews every field anyway.
 */
export function toExtractedReceipt(
  answer: unknown,
  fallbackCurrency: CurrencyCode,
  categories: readonly string[] = [],
): ExtractedReceipt {
  const parsed = answerSchema.parse(answer);
  if (!parsed.isReceipt) throw new NotAReceiptError();

  const code = parsed.currency?.trim().toUpperCase();
  const detected = code && isCurrencyCode(code) ? code : null;
  const currency = detected ?? fallbackCurrency;

  const items = parsed.items.flatMap((item) => {
    const total = safely(() => Money.parse(item.total, currency));
    const description = item.description.trim().slice(0, 200);
    if (!total || !description) return [];
    const quantity = /^\d+(\.\d{1,3})?$/.test(item.quantity) ? item.quantity : "1";
    return [{ description, quantity, total }];
  });

  const suggested = parsed.category
    ? (categories.find((c) => c.toLowerCase() === parsed.category!.trim().toLowerCase()) ?? null)
    : null;

  return {
    merchant: parsed.merchant?.trim().slice(0, 120) || null,
    suggestedCategory: suggested,
    purchasedOn: parsed.date ? safely(() => parseIsoDate(parsed.date!)) : null,
    currency: detected,
    total: parsed.total ? safely(() => Money.parse(parsed.total!, currency)) : null,
    items,
  };
}
