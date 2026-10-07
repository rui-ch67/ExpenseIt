import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { ButtonLink } from "@/ui/button";
import { DemoButton } from "@/ui/demo-button";

// Interim front page. The full landing page is designed as its own surface next.
export default async function Welcome() {
  if (await getCurrentUser()) redirect("/home");
  return (
    <main data-surface="dark" className="flex min-h-dvh flex-col bg-cat-violet px-5 py-6 text-white lg:px-12 lg:py-10">
      <span className="text-xl font-extrabold tracking-tight">ExpenseIt</span>
      <div className="my-auto max-w-2xl py-12">
        <h1 className="text-[clamp(3rem,12vw,6rem)] leading-[0.9] font-extrabold tracking-[-0.04em]">
          Snap a receipt. See where your money goes.
        </h1>
        <p className="mt-5 max-w-md text-lg font-semibold">
          ExpenseIt reads your receipts, files every item under the right category, and tells you each month
          where it all went.
        </p>
        <div className="mt-8 grid max-w-sm gap-3">
          <DemoButton className="[&_button]:border-white [&_button]:bg-white [&_button]:text-ink" />
          <ButtonLink href="/sign-in" variant="secondary" className="border-white bg-transparent text-white hover:bg-white/10">
            Sign in
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm">
          New here? <Link href="/sign-up" className="font-bold text-white">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
