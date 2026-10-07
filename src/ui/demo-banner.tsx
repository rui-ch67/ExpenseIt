"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DEMO_BANNER_COOKIE, DEMO_BANNER_DISMISSED } from "./demo-banner-cookie";

/**
 * Tells portfolio visitors what they're looking at, and how to keep going.
 * On phones it floats over the top of the page; on wide screens it's a strip
 * above the content. Closing it lasts for the demo's lifetime (a day).
 */
export function DemoBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  function close() {
    document.cookie = `${DEMO_BANNER_COOKIE}=${DEMO_BANNER_DISMISSED}; path=/; max-age=86400; samesite=lax`;
    setClosed(true);
  }

  return (
    <aside
      aria-label="Demo account"
      data-surface="dark"
      className="drop-in fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-50 bg-ink text-white ring-2 ring-paper lg:static lg:animate-none lg:ring-0"
    >
      <div className="flex items-start gap-2 py-2.5 pr-1.5 pl-4 text-sm lg:mx-auto lg:max-w-5xl lg:items-center lg:py-1 lg:pr-6 lg:pl-8">
        <p className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-0.5">
          <span>
            <strong className="font-bold">Demo account.</strong> The spending here is sample data, and it resets
            after a day.
          </span>
          <Link href="/sign-up" className="font-bold text-cat-lime">
            Create your own account
          </Link>
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Close the demo notice"
          className="grid size-9 shrink-0 place-items-center transition-colors duration-150 hover:bg-white/15"
        >
          <X aria-hidden className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  );
}
