import Link from "next/link";

/** Tells portfolio visitors what they're looking at, and how to keep going. */
export function DemoBanner() {
  return (
    <div data-surface="dark" className="bg-ink px-4 py-2 text-sm text-white lg:px-8">
      <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>
          <strong className="font-bold">Demo account.</strong> The spending here is sample data, and it
          resets after a day.
        </span>
        <Link href="/sign-up" className="font-bold text-cat-lime">
          Create your own account
        </Link>
      </p>
    </div>
  );
}
