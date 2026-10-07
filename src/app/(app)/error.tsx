"use client";

import * as Sentry from "@sentry/nextjs";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/ui/button";

/** A page inside the app failed to render: keep the navigation, offer a way back. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Server errors carry a digest and were already reported on the server.
    if (!error.digest) Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-4 py-12 lg:px-8">
      <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] text-balance">
        This page didn&rsquo;t load
      </h1>
      <p className="mt-4 text-muted">
        Something went wrong on our side. Nothing you&rsquo;ve saved is affected. Try again, or head back home.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => retry()}>
          <RotateCw aria-hidden className="size-5" strokeWidth={2.5} />
          Try again
        </Button>
        <ButtonLink href="/home" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </main>
  );
}
