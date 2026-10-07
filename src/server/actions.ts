import "server-only";
import { unstable_rethrow } from "next/navigation";
import { DomainError } from "@/domain/errors";
import { reportError } from "./report-error";

/** What every server action hands back to its form. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Runs an action body, turning business-rule errors (validation, not found,
 * limits) into a message the form can show. Unexpected errors are reported
 * (log and Sentry) and replaced with a generic message, so internals never
 * reach the browser.
 * Next.js redirects and not-found signals are re-thrown untouched.
 */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DomainError) return { ok: false, error: error.message };
    reportError(error);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

