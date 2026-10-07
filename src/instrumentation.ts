import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

/** Server start-up: error reporting for server components, actions and API routes. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(sentryOptions(process.env.VERCEL_ENV));
  }
}

/** Errors Next.js catches while rendering or handling a request. */
export const onRequestError = Sentry.captureRequestError;
