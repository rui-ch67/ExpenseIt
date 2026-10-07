import { Download } from "lucide-react";
import { CURRENCIES, CURRENCY_CODES } from "@/domain/currency";
import type { ReactNode } from "react";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { toCategoryView } from "@/server/views";
import { ButtonLink } from "@/ui/button";
import { PageHeader } from "@/ui/page-header";
import { CategoryManager, CurrencyForm, DeleteAccount, SignOutButton } from "@/ui/settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const { settings, categories } = getServices();
  const [current, list] = await Promise.all([settings.get(user.id), categories.list(user.id)]);

  return (
    <main className="mx-auto max-w-2xl pb-12 lg:px-8">
      <PageHeader title="Settings" />
      <div className="grid gap-10 px-4 lg:px-0">
        <Section title="Account">
          {user.isDemo ? (
            <p className="max-w-prose text-muted">
              You&rsquo;re in a demo account with sample data. It&rsquo;s deleted after a day. Create an account to keep
              your own spending.
            </p>
          ) : (
            <p>
              <strong className="font-bold">{user.name}</strong>
              <span className="block text-muted">{user.email}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {user.isDemo && <ButtonLink href="/sign-in">Create an account</ButtonLink>}
            <SignOutButton />
          </div>
        </Section>

        <Section title="Home currency">
          <CurrencyForm
            current={current.homeCurrency}
            currencies={CURRENCY_CODES.map((code) => ({ code, name: CURRENCIES[code].name }))}
          />
        </Section>

        <Section title="Categories" description="Tap one to rename it, change its colour or delete it. Deleting keeps its expenses.">
          <CategoryManager categories={list.map(toCategoryView)} />
        </Section>

        <Section title="Your data" description="Download everything you've logged, or delete your account and all of it.">
          <div className="flex flex-wrap gap-2">
            <a href="/api/export" className="inline-flex items-center gap-2 border-2 border-ink px-4 py-3 font-bold no-underline hover:bg-wash">
              <Download aria-hidden className="size-5" strokeWidth={2.5} />
              Download all expenses (CSV)
            </a>
          </div>
          <DeleteAccount isDemo={user.isDemo} />
        </Section>

        <Section title="About">
          <p className="max-w-prose text-muted">
            ExpenseIt v2. Receipts are read by Google Gemini; exchange rates are the European Central Bank&rsquo;s.{" "}
            <a href="https://github.com/rui-ch67/ExpenseIt" className="font-bold text-ink">
              Source on GitHub
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t-2 border-ink pt-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
