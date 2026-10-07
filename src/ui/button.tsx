import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white border-ink hover:bg-[#2a2a2a]",
  secondary: "bg-paper text-ink border-ink hover:bg-wash",
  ghost: "bg-transparent text-ink border-transparent hover:bg-wash",
  danger: "bg-paper text-danger border-danger hover:bg-[#fdf0ee]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 border-2 px-4 py-3 text-base font-bold leading-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], "no-underline", className)} {...props}>
      {children}
    </Link>
  );
}
