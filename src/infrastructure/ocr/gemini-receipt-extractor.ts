import { ApiError, GoogleGenAI } from "@google/genai";
import type { ReceiptExtraction, ReceiptExtractor, ReceiptImage } from "@/application/ports";
import type { CurrencyCode } from "@/domain/currency";
import { ServiceUnavailableError } from "@/domain/errors";
import { receiptJsonSchema, receiptPrompt, toExtractedReceipt } from "./receipt-schema";

/**
 * Tried in order. When a model's free daily quota runs out (429), it is
 * overloaded (503), it hangs, or it has been retired (404), the next one is
 * used, so scanning keeps working. All three read the test receipt
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
 * Time limits. When the service is overloaded a model can hang rather than
 * refuse, so each one gets a fixed slice, and the whole chain finishes inside
 * the upload route's 60 second limit (src/app/api/receipts/route.ts).
 */
export const OCR_TIME_LIMITS = { perModelMs: 25_000, totalMs: 50_000, minimumMs: 5_000 };

/** Errors worth trying the next model for: quota, overload, retirement, a hang or malformed JSON. */
export function isWorthRetrying(error: unknown): boolean {
  if (error instanceof ApiError) return RETRYABLE_STATUS.has(error.status);
  if (error instanceof SyntaxError) return true;
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * Runs `attempt` for each model in order until one succeeds, giving each the
 * time left in the overall budget (capped per model). Errors that another
 * model might not hit move on to the next; any other error stops the chain.
 */
export async function firstModelThatAnswers<T>(
  models: readonly string[],
  attempt: (model: string, timeoutMs: number) => Promise<T>,
  limits = OCR_TIME_LIMITS,
): Promise<{ model: string; result: T }> {
  const deadline = Date.now() + limits.totalMs;
  let lastError: unknown;
  for (const model of models) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < limits.minimumMs) break;
    try {
      return { model, result: await attempt(model, Math.min(limits.perModelMs, timeLeft)) };
    } catch (error) {
      if (!isWorthRetrying(error)) throw error;
      lastError = error;
    }
  }
  console.error("No Gemini model answered", lastError);
  throw new ServiceUnavailableError(
    "Receipt scanning is busy right now. Try again in a few minutes, or add the expense by hand.",
  );
}

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
    const { model, result: raw } = await firstModelThatAnswers(this.models, (m, timeoutMs) =>
      this.ask(m, image, hints.categories, timeoutMs),
    );
    return { receipt: toExtractedReceipt(raw, hints.fallbackCurrency, hints.categories), model, raw };
  }

  private async ask(
    model: string,
    image: ReceiptImage,
    categories: readonly string[],
    timeoutMs: number,
  ): Promise<unknown> {
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
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });
    return JSON.parse(response.text ?? "");
  }
}
