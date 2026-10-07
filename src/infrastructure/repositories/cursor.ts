import { ValidationError } from "@/domain/errors";

/**
 * Keyset pagination cursors: an opaque, URL-safe encoding of the sort key of
 * the last row on a page. Unlike OFFSET, the next page stays correct when
 * rows are added or removed in the meantime, and stays fast on long lists.
 */
export function encodeCursor(parts: readonly string[]): string {
  return Buffer.from(JSON.stringify(parts)).toString("base64url");
}

export function decodeCursor(cursor: string, expectedParts: number): string[] {
  try {
    const parts: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      Array.isArray(parts) &&
      parts.length === expectedParts &&
      parts.every((p) => typeof p === "string")
    ) {
      return parts;
    }
  } catch {
    // Fall through to the error below.
  }
  throw new ValidationError("Invalid page cursor");
}
