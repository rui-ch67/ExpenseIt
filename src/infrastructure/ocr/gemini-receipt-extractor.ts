import { ApiError, GoogleGenAI } from "@google/genai";
import type { ReceiptExtraction, ReceiptExtractor, ReceiptImage } from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { ServiceUnavailableError } from "@/domain/errors";
import { receiptJsonSchema, receiptPrompt, toExtractedReceipt } from "./receipt-schema";

/**
 * Tried in order. When a model's free daily quota runs out (429), it is
 * overloaded (503) or it has been retired (404), the next one is used, so
 * scanning keeps working. All three read the test receipt
 * (src/test/fixtures/receipt-grocer.jpg) perfectly; the Lite models answer
 * in about half the time. Override with GEMINI_MODEL (comma-separated).
 */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
];

const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);

/**
 * Reads receipts with Google Gemini. The image is sent inline, so there is
 * no need to upload it somewhere public first (v1 uploaded to Firebase only
 * so the OCR service could fetch it by URL).
 */
export class GeminiReceiptExtractor implements ReceiptExtractor {
  private readonly client: GoogleGenAI;

  /** Configured from GEMINI_API_KEY and the optional GEMINI_MODEL list. */
  static fromEnv(): ReceiptExtractor {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        extract: async () => {
          throw new ServiceUnavailableError("Receipt scanning isn't set up (GEMINI_API_KEY is missing)");
        },
      };
    }
    const models = process.env.GEMINI_MODEL?.split(",").map((m) => m.trim()).filter(Boolean);
    return new GeminiReceiptExtractor(apiKey, models?.length ? models : DEFAULT_GEMINI_MODELS);
  }

  constructor(
    apiKey: string,
    private readonly models: readonly string[] = DEFAULT_GEMINI_MODELS,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async extract(
    image: ReceiptImage,
    hints: { fallbackCurrency: CurrencyCode; categories: readonly string[] },
  ): Promise<ReceiptExtraction> {
    let lastError: unknown;
    for (const model of this.models) {
      try {
        const raw = await this.ask(model, image, hints.categories);
        return {
          receipt: toExtractedReceipt(raw, hints.fallbackCurrency, hints.categories),
          model,
          raw,
        };
      } catch (error) {
        if (error instanceof ApiError && RETRYABLE_STATUS.has(error.status)) {
          lastError = error;
          continue;
        }
        if (error instanceof SyntaxError) {
          lastError = error; // Malformed JSON: another model may do better.
          continue;
        }
        throw error;
      }
    }
    console.error("All Gemini models failed", lastError);
    throw new ServiceUnavailableError(
      "Receipt scanning is busy right now. Try again in a few minutes, or add the expense by hand.",
    );
  }

  private async ask(model: string, image: ReceiptImage, categories: readonly string[]): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: image.contentType,
                data: Buffer.from(image.bytes).toString("base64"),
              },
            },
            { text: receiptPrompt(categories) },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: receiptJsonSchema(categories),
        abortSignal: AbortSignal.timeout(45_000),
      },
    });
    return JSON.parse(response.text ?? "");
  }
}
