import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export const INPUT =
  "w-full border-2 border-ink bg-paper px-3 py-2.5 text-base outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 aria-invalid:border-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(INPUT, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(INPUT, "min-h-20 resize-y", className)} {...props} />;
}
