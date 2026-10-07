import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const withoutQuery = (url: string) => url.split(/[?#]/)[0];

/**
 * Sentry settings shared by the browser and the server. Errors only: no
 * performance tracing and no session replays, which would spend the free
 * plan's quota and record more about visitors than an error report needs.
 */
export function sentryOptions(environment: string | undefined) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    // Deployed builds only, and only once a DSN is set.
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    environment: environment ?? "development",
    sendDefaultPii: false,
    // Noise that isn't a bug in ExpenseIt: browser quirks, extensions, dropped connections.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Failed to fetch",
      "Load failed",
      "NetworkError when attempting to fetch resource",
      "AbortError",
    ],
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari(-web)?-extension:\/\//i],
    // Searches typed into Activity live in the query string: never send them.
    beforeSend(event: ErrorEvent) {
      if (event.request) {
        if (event.request.url) event.request.url = withoutQuery(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      for (const key of ["url", "from", "to"]) {
        const value = breadcrumb.data?.[key];
        if (typeof value === "string") breadcrumb.data![key] = withoutQuery(value);
      }
      return breadcrumb;
    },
  };
}
