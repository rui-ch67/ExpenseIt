import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./cn";
import { INPUT } from "./field";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(INPUT, "appearance-none pr-10", className)} {...props} />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        strokeWidth={2.5}
      />
    </div>
  );
}
