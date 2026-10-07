import { PenLine } from "lucide-react";
import Link from "next/link";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { PageHeader } from "@/ui/page-header";
import { Scanner } from "@/ui/scanner";

export const metadata = { title: "Scan a receipt" };

export default async function ScanPage() {
  const user = await requireUser();
  const scansLeft = await getServices().receipts.scansLeft(user);
  return (
    <main className="mx-auto max-w-3xl pb-10 lg:px-8">
      <PageHeader title="Scan a receipt" />
      <div className="px-4 lg:px-0">
        <p className="mb-5 max-w-prose text-muted">
          Lay the receipt flat with the total in shot. ExpenseIt reads the shop, the date and every item, and you check
          it all before anything is saved.
        </p>
        <Scanner scansLeft={scansLeft} isDemo={user.isDemo} />
        <p className="mt-6 text-sm">
          <Link href="/expenses/new" className="inline-flex items-center gap-1.5 font-bold">
            <PenLine aria-hidden className="size-4" strokeWidth={2.5} />
            No receipt? Add the expense by hand
          </Link>
        </p>
      </div>
    </main>
  );
}
