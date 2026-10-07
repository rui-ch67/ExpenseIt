"use client";

import { LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { rescanReceipt } from "@/app/actions/receipts";
import { Button } from "./button";

/** Read the stored photo again (it may have been a busy moment). */
export function RescanButton({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <Button
        onClick={() =>
          startTransition(async () => {
            const result = await rescanReceipt(receiptId);
            if (!result.ok) setMessage(result.error);
            else if (result.data.problem) setMessage(result.data.problem);
            router.refresh();
          })
        }
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />
        ) : (
          <RotateCw aria-hidden className="size-5" strokeWidth={2.5} />
        )}
        {pending ? "Reading it again…" : "Try reading it again"}
      </Button>
      {message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

/** While a receipt is still being read, check back every few seconds. */
export function RefreshWhileProcessing() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
