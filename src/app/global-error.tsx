"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

/** Last resort, when even the root layout fails. It replaces the whole document. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body className="min-h-dvh bg-paper text-ink">
        <title>Something went wrong · ExpenseIt</title>
        <main className="mx-auto max-w-xl px-4 py-16">
          <p className="text-lg font-extrabold">ExpenseIt</p>
          <h1 className="mt-10 text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">Something went wrong</h1>
          <p className="mt-4 text-muted">Nothing you&rsquo;ve saved is affected. Try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 border-2 border-ink bg-ink px-4 py-3 font-bold text-white hover:bg-[#2a2a2a]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
