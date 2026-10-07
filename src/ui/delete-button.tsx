"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";
import { Button } from "./button";

/** Two-step delete: the first press asks, the second does it. */
export function DeleteButton({
  label,
  confirmLabel,
  action,
}: {
  label: string;
  confirmLabel: string;
  action: () => Promise<ActionResult<unknown>>;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <Button variant="ghost" className="justify-self-start px-0 text-danger hover:bg-transparent hover:underline" onClick={() => setAsking(true)}>
        <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
        {label}
      </Button>
    );
  }
  return (
    <div className="grid gap-2" role="group" aria-label={label}>
      <p className="text-sm font-semibold">{confirmLabel}</p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await action();
              if (result && !result.ok) setError(result.error);
            })
          }
        >
          Delete
        </Button>
        <Button variant="secondary" onClick={() => setAsking(false)} disabled={pending}>
          Keep it
        </Button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
