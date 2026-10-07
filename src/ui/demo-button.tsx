"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./button";
import { cn } from "./cn";

/** One click to a private demo account filled with sample spending. */
export function DemoButton({ className, label = "Try the demo" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setState("loading");
    const { error } = await authClient.signIn.anonymous();
    if (error) {
      setState("error");
      setMessage(
        error.status === 429
          ? "You've started a few demos already. Try again in an hour, or create an account."
          : "The demo couldn't start. Please try again.",
      );
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Button onClick={start} disabled={state === "loading"} aria-busy={state === "loading"}>
        {state === "loading" ? (
          <>
            <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />
            Setting up your demo…
          </>
        ) : (
          <>
            {label}
            <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
          </>
        )}
      </Button>
      {message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
