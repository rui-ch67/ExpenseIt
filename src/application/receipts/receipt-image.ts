import { ValidationError } from "@/domain/errors";
import type { ReceiptImage, ReceiptImageType } from "../ports";

/** Vercel functions accept request bodies up to 4.5 MB; stay safely under it. */
export const MAX_RECEIPT_IMAGE_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<ReceiptImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Identifies the image from its first bytes rather than trusting the file
 * name or the browser's claimed type.
 */
function sniffType(bytes: Uint8Array): ReceiptImageType | null {
  const starts = (...signature: number[]) => signature.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function toReceiptImage(bytes: Uint8Array): ReceiptImage {
  if (bytes.byteLength === 0) {
    throw new ValidationError("The photo is empty");
  }
  if (bytes.byteLength > MAX_RECEIPT_IMAGE_BYTES) {
    throw new ValidationError("That photo is too large. Photos up to 4 MB work.");
  }
  const contentType = sniffType(bytes);
  if (!contentType) {
    throw new ValidationError("Use a JPEG, PNG or WebP photo of the receipt");
  }
  return { bytes, contentType };
}

export function extensionFor(type: ReceiptImageType): string {
  return EXTENSIONS[type];
}
