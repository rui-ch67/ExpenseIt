import type { ReactNode } from "react";

/** Title row for in-app pages; actions sit on the right. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 pt-6 pb-5 lg:px-0 lg:pt-10">
      <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em]">{title}</h1>
      {children}
    </header>
  );
}
