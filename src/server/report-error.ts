import "server-only";
import * as Sentry from "@sentry/nextjs";
import { waitUntil } from "@vercel/functions";

/**
 * For errors the app catches and turns into a friendly message: logs them and
 * sends them to Sentry, keeping the function alive until the report is out.
 */
export function reportError(error: unknown): void {
  console.error(error);
  Sentry.captureException(error);
  waitUntil(Sentry.flush(2000));
}
