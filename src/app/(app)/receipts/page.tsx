import { Camera } from "lucide-react";
import Link from "next/link";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { ButtonLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { formatLongDate } from "@/ui/format";
import { PageHeader } from "@/ui/page-header";

export const metadata = { title: "Receipts" };

export default async function ReceiptsPage() {
  const user = await requireUser();
  const { receipts, expenses } = getServices();
  const { items } = await receipts.list(user.id, 50);
  const saved = await expenses.savedReceiptIds(
    user.id,
    items.map((r) => r.id),
  );

  return (
    <main className="mx-auto max-w-3xl pb-10 lg:px-8">
      <PageHeader title="Receipts">
        <ButtonLink href="/scan" className="px-3 py-2 text-sm">
          <Camera aria-hidden className="size-4" strokeWidth={2.5} />
          Scan
        </ButtonLink>
      </PageHeader>
      {items.length === 0 ? (
        <div className="mx-4 border-2 border-dashed border-ink p-5 lg:mx-0">
          <p className="text-lg font-extrabold">No receipts yet.</p>
          <p className="mt-1 text-muted">Scanned receipts are kept here with their photos and items.</p>
        </div>
      ) : (
        <ul>
          {items.map((receipt) => {
            const status = saved.has(receipt.id) ? "saved" : receipt.status === "failed" ? "couldn't read" : "to check";
            return (
              <li key={receipt.id}>
                <Link
                  href={`/receipts/${receipt.id}`}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-t border-rule px-4 py-3 no-underline hover:bg-wash lg:px-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
                  <img src={`/api/receipts/${receipt.id}/image`} alt="" className="size-12 border-2 border-ink object-cover object-top" />
                  <span className="min-w-0">
                    <strong className="block truncate font-bold">{receipt.merchant || "Unnamed receipt"}</strong>
                    <span className="text-[13px] text-muted">
                      {receipt.purchasedOn ? formatLongDate(receipt.purchasedOn) : "No date"} · {receipt.items.length} items
                    </span>
                  </span>
                  <span className="grid justify-items-end gap-1">
                    <strong className="font-extrabold">{receipt.total?.format() ?? "–"}</strong>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[11px] font-bold",
                        status === "saved" ? "bg-wash" : status === "to check" ? "bg-cat-lime" : "bg-danger text-white",
                      )}
                    >
                      {status}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
