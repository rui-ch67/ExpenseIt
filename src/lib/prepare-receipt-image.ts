"use client";

/**
 * Gets a receipt photo ready to upload, in the browser, before it leaves the
 * phone. This replaces what ML Kit's document scanner did in v1:
 *
 * - Rotation: phone photos are often stored sideways with an EXIF flag;
 *   decoding with `imageOrientation: "from-image"` bakes the rotation in.
 * - Size: a 12-megapixel photo is 3–6 MB. Scaling the long edge to 2000 px
 *   keeps small print legible for OCR while cutting uploads to a few hundred
 *   KB, which matters on mobile data and keeps us under the 4 MB limit.
 * - Format: always JPEG, so HEIC and other camera formats never reach the
 *   server.
 *
 * Cropping and perspective correction are deliberately left out: Gemini reads
 * tilted, uncropped receipts accurately (see src/test/fixtures), and an
 * automatic crop that misjudges an edge can cut off the total.
 */
const MAX_EDGE = 2000;
const MAX_BYTES = 3.5 * 1024 * 1024;

export async function prepareReceiptImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo couldn't be opened. Try a JPEG or PNG, or take the photo again.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn't process the photo.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Step quality down only if a very detailed photo is still too large.
  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("This photo is too large to upload. Try taking it again.");
}
