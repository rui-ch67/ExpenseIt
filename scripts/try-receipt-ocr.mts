/**
 * Developer tool: run receipt extraction on a local image and print what
 * each model read, with timings. Uses GEMINI_API_KEY from .env.local.
 *
 *   pnpm ocr:try path/to/receipt.jpg [model ...]
 */
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { config } from "dotenv";
import type { ReceiptImageType } from "@/application/ports";
import { DEFAULT_GEMINI_MODELS, GeminiReceiptExtractor } from "@/infrastructure/ocr/gemini-receipt-extractor";

config({ path: ".env.local", quiet: true });

const [path, ...models] = process.argv.slice(2);
if (!path) {
  console.error("Usage: pnpm ocr:try <image> [model ...]");
  process.exit(1);
}
const types: Record<string, ReceiptImageType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const image = { bytes: await readFile(path), contentType: types[extname(path).toLowerCase()] };

for (const model of models.length > 0 ? models : DEFAULT_GEMINI_MODELS) {
  const started = performance.now();
  try {
    const { receipt } = await new GeminiReceiptExtractor(process.env.GEMINI_API_KEY!, [model]).extract(
      image,
      { fallbackCurrency: "GBP" },
    );
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    const itemSum = receipt.items.reduce((sum, i) => sum + i.total.minor, 0) / 100;
    console.log(`\n■ ${model} (${seconds}s)`);
    console.log(`  ${receipt.merchant} · ${receipt.purchasedOn} · ${receipt.currency} · total ${receipt.total?.toDecimalString()} · items add up to ${itemSum.toFixed(2)}`);
    for (const item of receipt.items) {
      console.log(`  ${item.quantity.padStart(6)} × ${item.description.padEnd(28)} ${item.total.toDecimalString().padStart(7)}`);
    }
  } catch (error) {
    console.log(`\n■ ${model}: ${error instanceof Error ? error.message : error}`);
  }
}
