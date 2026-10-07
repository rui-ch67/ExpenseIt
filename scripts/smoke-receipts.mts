/**
 * End-to-end check of the receipt pipeline against the real services in
 * .env.local (Neon, private Vercel Blob, Gemini). Creates a throwaway user,
 * scans the test receipt, splits it into expenses, reads the photo back,
 * then deletes everything it made.
 *
 *   pnpm smoke:receipts
 */
import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { eq } = await import("drizzle-orm");
const { getDb } = await import("@/infrastructure/db/client");
const { users } = await import("@/infrastructure/db/schema");
const { createServices } = await import("@/server/container");
const { toReceiptImage } = await import("@/application/receipts/receipt-image");

const db = getDb();
const services = createServices(db);
const user = { id: `smoke-${Date.now()}`, isDemo: false };
const step = (label: string, started: number) =>
  console.log(`✓ ${label} (${((performance.now() - started) / 1000).toFixed(1)}s)`);

await db.insert(users).values({ id: user.id, name: "Smoke test", email: `${user.id}@example.test` });
try {
  await services.accountSetup.setUp({ id: user.id });

  let t = performance.now();
  const image = toReceiptImage(await readFile("src/test/fixtures/receipt-grocer.jpg"));
  const { receipt, problem } = await services.receipts.scan(user, image);
  if (problem) throw new Error(`Scan problem: ${problem}`);
  step(`scanned: ${receipt.merchant}, ${receipt.purchasedOn}, ${receipt.total?.format()}, ${receipt.items.length} items`, t);

  t = performance.now();
  const photo = await services.receipts.photo(user.id, receipt.id);
  const bytes = photo ? (await new Response(photo.body).arrayBuffer()).byteLength : 0;
  if (bytes !== image.bytes.byteLength) throw new Error("Photo read back doesn't match");
  step(`private photo read back intact (${(bytes / 1024).toFixed(0)} KB, ${photo!.contentType})`, t);

  t = performance.now();
  const categories = await services.categories.list(user.id);
  const grocery = categories.find((c) => c.name === "Grocery")!;
  const other = categories.find((c) => c.name === "Other")!;
  const household = receipt.items.filter((i) => /bleach|kitchen|dishwasher/i.test(i.description));
  const expenses = await services.receipts.saveAsExpenses(user.id, receipt.id, {
    categoryId: grocery.id,
    itemCategories: Object.fromEntries(household.map((i) => [i.id, other.id])),
  });
  step(`saved as ${expenses.map((e) => `${e.title} ${e.amount.format()}`).join(" + ")}`, t);

  t = performance.now();
  await services.receipts.delete(user.id, receipt.id);
  // Bypass the CDN: it may briefly keep a copy of a photo that was read before
  // deletion. Only the server can read private blobs, and the photo route
  // checks the receipt still exists first, so that copy is never served.
  const { get } = await import("@vercel/blob");
  const { VercelBlobImageStore } = await import("@/infrastructure/storage/vercel-blob-image-store");
  const blobPath = new VercelBlobImageStore().blobPath(receipt.imagePath!);
  if ((await get(blobPath, { access: "private", useCache: false })) !== null) {
    throw new Error("Photo still in Blob after delete");
  }
  step("deleted receipt and its photo from Blob", t);
} finally {
  await db.delete(users).where(eq(users.id, user.id));
  console.log("✓ cleaned up test user");
}
