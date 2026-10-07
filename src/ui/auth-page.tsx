import Link from "next/link";
import type { ReactNode } from "react";
import { DemoButton } from "./demo-button";

/** Shared frame for sign in and sign up: the form beside a colour block. */
export function AuthPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col px-5 py-6 lg:px-12 lg:py-10">
        <Link href="/" className="text-xl font-extrabold tracking-tight no-underline">
          ExpenseIt
        </Link>
        <div className="my-auto w-full max-w-sm py-10">
          <h1 className="text-4xl leading-none font-extrabold tracking-[-0.03em]">{title}</h1>
          <div className="mt-8">{children}</div>
          <div className="mt-8 border-t-2 border-ink pt-6">
            <p className="mb-3 text-sm font-semibold">Just looking? Explore with sample data, no sign-up.</p>
            <DemoButton />
          </div>
        </div>
      </section>
      <aside data-surface="dark" className="hidden flex-col justify-end bg-cat-violet p-12 text-white lg:flex">
        <p className="max-w-md text-5xl leading-[0.95] font-extrabold tracking-[-0.03em]">
          Snap a receipt. See where your money goes.
        </p>
        <div className="mt-8 flex h-4 ring-2 ring-white">
          <span className="flex-[5] bg-cat-violet" />
          <span className="flex-[2] bg-cat-lime" />
          <span className="flex-[1.5] bg-cat-orange" />
          <span className="flex-1 bg-cat-indigo" />
          <span className="flex-[0.8] bg-cat-fuchsia" />
        </div>
      </aside>
    </main>
  );
}
