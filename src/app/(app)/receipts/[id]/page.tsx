import { Check, LoaderCircle } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deleteReceipt } from "@/app/actions/receipts";
import { CURRENCY_CODES } from "@/domain/currency";
import { todayIn } from "@/domain/dates";
import { NotFoundError } from "@/domain/errors";
import type { Receipt } from "@/domain/receipt";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { categoryMap, toCategoryView, toExpenseView, toReceiptView } from "@/server/views";
import { BackLink } from "@/ui/back-link";
import { ButtonLink } from "@/ui/button";
import { DeleteButton } from "@/ui/delete-button";
import { ExpenseRow } from "@/ui/expense-list";
import { formatLongDate } from "@/ui/format";
import { RefreshWhileProcessing, RescanButton } from "@/ui/receipt-actions";
import { ReceiptPhoto } from "@/ui/receipt-photo";
import { ReceiptReview } from "@/ui/receipt-review";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({ params, searchParams }: PageProps<"/receipts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { saved, manual } = await searchParams;
  const { receipts, expenses, categories } = getServices();
  const receipt = await receipts.get(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const [linked, list] = await Promise.all([expenses.listForReceipt(user.id, id), categories.list(user.id)]);
  const byId = categoryMap(list);
  const title = receipt.merchant || "Receipt";

  if (linked.length > 0) {
    return (
      <Layout receipt={receipt} title={title}>
        {saved && (
          <p role="status" className="flex items-center gap-2 bg-cat-lime px-3 py-2.5 font-bold">
            <Check aria-hidden className="size-5" strokeWidth={3} />
            Saved as {linked.length === 1 ? "an expense" : `${linked.length} expenses`}
          </p>
        )}
        <p className="text-muted">
          {receipt.total?.format()} on {receipt.purchasedOn ? formatLongDate(receipt.purchasedOn) : "an unknown date"}
          {" · "}
          {receipt.items.length} {receipt.items.length === 1 ? "item" : "items"}
        </p>
        <section aria-labelledby="expenses-heading">
          <h2 id="expenses-heading" className="pb-2 text-xl font-extrabold">
            {linked.length === 1 ? "Expense" : "Expenses"}
          </h2>
          <ul>
            {linked.map((e) => (
              <ExpenseRow key={e.id} expense={toExpenseView(e, byId)} />
            ))}
          </ul>
        </section>
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="pb-2 text-xl font-extrabold">
            On the receipt
          </h2>
          <ul className="grid">
            {receipt.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 border-t border-rule py-2 text-[15px]">
                <span>
                  {item.description}
                  {item.quantity !== "1" && <span className="text-muted"> × {item.quantity}</span>}
                </span>
                <span className="font-bold">{item.total.format()}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/home">Done</ButtonLink>
          <ButtonLink href="/scan" variant="secondary">
            Scan another
          </ButtonLink>
        </div>
        <DeleteButton
          label="Delete this receipt"
          confirmLabel="Delete the receipt and its photo? The expenses stay."
          action={deleteReceipt.bind(null, receipt.id)}
        />
      </Layout>
    );
  }

  if (receipt.status === "processing") {
    return (
      <Layout receipt={receipt} title="Reading your receipt">
        <RefreshWhileProcessing />
        <p className="flex items-center gap-2 font-bold">
          <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />
          Still reading. This page updates by itself.
        </p>
      </Layout>
    );
  }

  if (receipt.status === "failed" && !manual) {
    return (
      <Layout receipt={receipt} title="We couldn't read this one">
        <p className="max-w-prose">
          The photo is saved. Reading it failed, usually because the scanning service was busy. Try again, or type in the
          details yourself.
        </p>
        <div className="grid max-w-sm gap-2">
          <RescanButton receiptId={receipt.id} />
          <ButtonLink href={`/receipts/${receipt.id}?manual=1`} variant="secondary">
            Fill it in myself
          </ButtonLink>
        </div>
        <DeleteButton label="Delete this receipt" confirmLabel="Delete the receipt and its photo?" action={deleteReceipt.bind(null, receipt.id)} />
      </Layout>
    );
  }

  return (
    <Layout receipt={receipt} title="Check your receipt">
      <ReceiptReview
        receipt={toReceiptView(receipt)}
        categories={list.map(toCategoryView)}
        currencies={CURRENCY_CODES}
        suggestedCategoryId={(await suggestCategory(user.id, receipt.merchant)) ?? receipt.suggestedCategoryId}
        today={todayIn()}
      />
    </Layout>
  );
}

/** The category this shop's expenses usually go under, if there's a habit. */
async function suggestCategory(userId: string, merchant: string): Promise<string | null> {
  if (!merchant) return null;
  const { items } = await getServices().expenses.list(userId, { search: merchant, limit: 30 });
  const counts = new Map<string, number>();
  for (const e of items) {
    if (e.categoryId && e.title.toLowerCase() === merchant.toLowerCase()) {
      counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function Layout({ receipt, title, children }: { receipt: Receipt; title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 lg:px-8">
      <BackLink href="/receipts">Receipts</BackLink>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start lg:gap-10">
        {receipt.imagePath && <ReceiptPhoto receiptId={receipt.id} merchant={receipt.merchant} />}
        <div className="grid gap-6">
          <h1 className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] break-words">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
