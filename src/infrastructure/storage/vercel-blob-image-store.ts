import { del, get, put } from "@vercel/blob";
import type { ImageStore, ReceiptImage } from "@/application/ports";

/**
 * Receipt photos in a *private* Vercel Blob store: they have no public URL.
 * The app streams them through /api/receipts/[id]/image after checking the
 * receipt belongs to the signed-in user.
 *
 * Local development and the deployed app share one Blob store but not one
 * database, so photos from a developer machine are kept under `dev/`.
 */
export class VercelBlobImageStore implements ImageStore {
  constructor(private readonly prefix = process.env.VERCEL ? "" : "dev/") {}

  /** Where a stored path actually lives in the Blob store. */
  blobPath(path: string): string {
    return `${this.prefix}${path}`;
  }

  async put(path: string, image: ReceiptImage): Promise<void> {
    await put(this.blobPath(path), Buffer.from(image.bytes), {
      access: "private",
      contentType: image.contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  }

  async get(path: string) {
    const result = await get(this.blobPath(path), { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { body: result.stream, contentType: result.blob.contentType };
  }

  async delete(paths: readonly string[]): Promise<void> {
    if (paths.length > 0) await del(paths.map((p) => this.blobPath(p)));
  }
}
