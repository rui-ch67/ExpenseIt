"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "./cn";

/**
 * The receipt photo. On phones it starts as a strip to keep the form in
 * reach, and expands to the whole receipt so every value the AI read,
 * including the total, can be checked against the original.
 */
export function ReceiptPhoto({ receiptId, merchant }: { receiptId: string; merchant: string }) {
  const [expanded, setExpanded] = useState(false);
  const src = `/api/receipts/${receiptId}/image`;
  return (
    <figure className="border-2 border-ink lg:sticky lg:top-8">
      <a href={src} target="_blank" rel="noreferrer" aria-label="Open the receipt photo full size" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
        <img
          src={src}
          alt={`Photo of the receipt from ${merchant || "the shop"}`}
          className={cn(
            "block w-full object-top lg:max-h-[75vh] lg:object-contain",
            expanded ? "max-h-none object-contain" : "max-h-56 object-cover",
          )}
        />
      </a>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-center gap-1.5 border-t-2 border-ink py-2 text-sm font-bold lg:hidden"
      >
        {expanded ? <ChevronUp aria-hidden className="size-4" strokeWidth={2.5} /> : <ChevronDown aria-hidden className="size-4" strokeWidth={2.5} />}
        {expanded ? "Show less" : "Show the whole receipt"}
      </button>
    </figure>
  );
}
