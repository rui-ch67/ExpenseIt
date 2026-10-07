"use client";

import { ChartColumn, House, List, ScanLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";
import { Wordmark } from "./brand-mark";

const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/activity", label: "Activity", icon: List },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/activity") {
    return ["/activity", "/expenses", "/receipts"].some((p) => pathname.startsWith(p));
  }
  if (href === "/insights") {
    return ["/insights", "/budgets", "/recurring"].some((p) => pathname.startsWith(p));
  }
  return pathname.startsWith(href);
}

/** Bottom tab bar on phones. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, ...item }) => {
          const active = isActive(pathname, href);
          const primary = "primary" in item;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold no-underline",
                  primary
                    ? "bg-ink text-white"
                    : active
                      ? "text-ink shadow-[inset_0_4px_0_var(--color-ink)]"
                      : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active || primary ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left rail on wide screens. */
export function SideRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r-2 border-ink lg:flex">
      <Link href="/home" className="px-6 pt-6 pb-8 text-2xl font-extrabold tracking-tight no-underline">
        <Wordmark />
      </Link>
      <ul className="grid gap-1 px-3">
        {ITEMS.map(({ href, label, icon: Icon, ...item }) => {
          const active = isActive(pathname, href);
          if ("primary" in item) {
            return (
              <li key={href} className="my-2">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center gap-3 border-2 border-ink bg-ink px-3 py-3 font-bold text-white no-underline hover:bg-[#2a2a2a]"
                >
                  <Icon aria-hidden className="size-5" strokeWidth={2.5} />
                  Scan a receipt
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 font-bold no-underline",
                  active ? "bg-cat-lime text-ink" : "text-muted hover:bg-wash hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
