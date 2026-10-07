import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 pt-5 pb-4 text-sm font-bold no-underline hover:underline lg:pt-8">
      <ArrowLeft aria-hidden className="size-4" strokeWidth={2.5} />
      {children}
    </Link>
  );
}
