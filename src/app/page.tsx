import { ArrowRight, ChevronsLeftRight, CodeXml } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/server/session";
import { ButtonLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { DemoButton } from "@/ui/demo-button";
import { Compare } from "@/ui/landing/compare";
import { MonthPanel } from "@/ui/landing/month-panel";
import { ReceiptSlip, SLIPS } from "@/ui/landing/receipt-slip";
import { StoryPreview } from "@/ui/landing/story-preview";

const GITHUB = "https://github.com/rui-ch67/ExpenseIt";

/** What Gemini read from the sample receipt, as the review screen shows it. */
const SAMPLE_ITEMS: Array<[string, string, string]> = [
  ["Sourdough loaf", "", "2.40"],
  ["Semi skimmed milk 2pt", "", "1.25"],
  ["Free range eggs x12", "", "3.10"],
  ["Bananas loose", "0.845 kg", "0.76"],
  ["Cheddar 400g", "× 2", "7.00"],
  ["Multibuy saving", "", "−1.50"],
  ["Thick bleach 750ml", "", "1.15"],
  ["Kitchen roll 4pk", "", "4.20"],
  ["Dishwasher tabs 30", "", "5.75"],
];

export default async function Landing() {
  const user = await getCurrentUser();

  const before = (desktop: boolean) => (
    <div className="h-full bg-wash">
      {desktop
        ? DESKTOP_SLIPS.map(({ slip, style, tallOnly }, index) => (
            <ReceiptSlip
              key={index}
              slip={slip}
              style={style}
              className={tallOnly ? "hidden [@media(min-height:860px)]:block" : undefined}
            />
          ))
        : MOBILE_SLIPS.map(({ slip, style }, index) => <ReceiptSlip key={index} slip={slip} style={style} small />)}
    </div>
  );
  const after = (desktop: boolean) => (
    <div data-surface="dark" className="relative h-full bg-cat-violet">
      <div className={desktop ? "absolute top-[14%] right-12 left-[63%]" : "absolute top-6 right-3 left-[53%]"}>
        {/* The sample label sits in the panel's flow, so it's always in the first viewport. */}
        <MonthPanel compact={!desktop} label={desktop ? "Sample month from the demo" : undefined} />
      </div>
      {!desktop && (
        <span className="absolute right-3 bottom-3 bg-ink/40 px-2 py-1 text-xs font-bold text-white">Sample month</span>
      )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-5 lg:px-12">
          <Link href="/" className="text-2xl font-extrabold tracking-tight no-underline">
            ExpenseIt
          </Link>
          <div className="flex items-center gap-6 text-base font-bold">
            <a href="#how" className="hidden no-underline hover:underline sm:inline">
              How it works
            </a>
            <a href="#built" className="hidden no-underline hover:underline sm:inline">
              How it&rsquo;s built
            </a>
            {user ? (
              <ButtonLink href="/home" className="px-3 py-2 text-sm">
                Open the app
              </ButtonLink>
            ) : (
              <Link href="/sign-in" className="no-underline hover:underline">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* First viewport: drag from a pocket of receipts to the month they become. */}
        <section aria-labelledby="hero-heading" className="relative">
          <div className="relative z-20 px-5 pt-10 pb-8 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:mx-auto lg:max-w-[90rem] lg:px-12 lg:pt-[9vh]">
            <div className="lg:pointer-events-auto lg:w-[min(36%,34rem)]">
              <h1 id="hero-heading" className="text-[clamp(3rem,5.2vw,5rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-balance">
                From a pocket of receipts to a month you can read.
              </h1>
              <p className="mt-5 max-w-md text-lg font-semibold lg:text-xl">
                Snap each receipt. ExpenseIt reads every line and files it, so the pile on the left becomes the month on the
                right.
              </p>
              <div className="mt-7 flex flex-wrap items-start gap-3">
                <DemoButton />
                {!user && (
                  <ButtonLink href="/sign-up" variant="secondary">
                    Create an account
                  </ButtonLink>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-muted">The demo needs no sign-up and comes with a month of sample spending.</p>
              <p className="mt-6 hidden items-center gap-1.5 text-sm font-bold lg:flex">
                <ChevronsLeftRight aria-hidden className="size-4" strokeWidth={2.5} />
                Drag the handle to compare
              </p>
            </div>
          </div>

          <Compare
            className="hidden h-[calc(100svh-4rem)] min-h-[44rem] lg:block"
            before={before(true)}
            after={after(true)}
            min={40}
            max={100}
            initial={60}
          />
          <Compare
            className="mx-5 aspect-[4/5] border-2 border-ink lg:hidden"
            before={before(false)}
            after={after(false)}
            min={4}
            max={96}
            initial={50}
            handleTop={86}
          />
          <p className="px-5 pt-3 pb-2 text-sm font-bold lg:hidden">Drag the handle to compare</p>
        </section>

        <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-[90rem] scroll-mt-20 px-5 pt-24 pb-20 lg:px-12 lg:pt-32">
          <h2 id="how-heading" className="max-w-3xl text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
            It reads the whole receipt, not just the total.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Take a photo at the till. ExpenseIt pulls out the shop, the date and every item, files it under the right category,
            and shows you all of it before anything is saved.
          </p>

          <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
            <figure>
              <Image
                src="/samples/receipt-grocer.jpg"
                alt="A photo of a till receipt from Harbour Street Grocer, slightly tilted"
                width={1300}
                height={1300}
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="block h-auto w-full border-2 border-ink"
              />
              <figcaption className="mt-2 text-sm text-muted">A sample receipt we made for the demo. Try scanning it yourself.</figcaption>
            </figure>

            <div className="border-2 border-ink">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink bg-cat-lime px-5 py-4">
                <p className="text-2xl font-extrabold tracking-tight">Harbour Street Grocer</p>
                <p className="font-bold">14 September · £24.11</p>
              </div>
              <ul className="px-5 py-2">
                {SAMPLE_ITEMS.map(([name, qty, price]) => (
                  <li key={name} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-0">
                    <span className="font-bold">
                      {name} {qty && <span className="font-semibold text-muted">{qty}</span>}
                    </span>
                    <span className={cn("font-extrabold", price.startsWith("−") && "text-muted")}>{price}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t-2 border-ink px-5 py-4">
                <p className="text-sm font-bold">Filed as two expenses, after moving the household items to shopping:</p>
                <div className="mt-3 flex h-4 gap-px bg-ink ring-2 ring-ink">
                  <span className="bg-cat-lime" style={{ flex: 1366 }} />
                  <span className="bg-cat-amber" style={{ flex: 1045 }} />
                </div>
                <p className="mt-3 flex flex-wrap gap-2 text-lg font-extrabold">
                  <span className="bg-cat-lime px-2 py-1">grocery £13.66</span>
                  <span className="bg-cat-amber px-2 py-1">shopping £10.45</span>
                </p>
                <p className="mt-2 text-sm text-muted">The £1.50 multibuy saving is shared fairly, so the two always add up to £24.11.</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="recap-heading" data-surface="dark" className="bg-ink py-20 text-white lg:py-28">
          <div className="mx-auto grid max-w-[90rem] gap-12 px-5 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:px-12">
            <div>
              <h2 id="recap-heading" className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
                Every month, wrapped.
              </h2>
              <p className="mt-4 max-w-md text-lg text-white/80">
                When a month ends, ExpenseIt tells it back to you as a story: where most of it went, your local, your biggest
                day, what you spent abroad. Tap through, then share it.
              </p>
            </div>
            <figure className="min-w-0">
              <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-12 text-ink lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
                <StoryPreview ground="bg-cat-lime" headline="£1,426" lede="spent in September across 41 purchases." focus={-1} className="w-44 shrink-0 snap-start lg:w-auto" />
                <StoryPreview ground="bg-cat-violet text-white" tag="bills" headline="£683" lede="went on bills, 48% of the month." focus={0} className="w-44 shrink-0 snap-start lg:w-auto lg:translate-y-6" />
                <StoryPreview ground="bg-cat-orange" headline="Costa" lede="was your local: 5 visits." focus={2} className="w-44 shrink-0 snap-start lg:w-auto lg:translate-y-12" />
              </div>
              <figcaption className="text-sm text-white/70">Sample recap from the demo account.</figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="more-heading" className="mx-auto max-w-[90rem] px-5 pt-28 pb-20 lg:px-12">
          <h2 id="more-heading" className="text-[clamp(2rem,3.6vw,3.25rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
            And the everyday things, done properly.
          </h2>
          <ul className="mt-10 grid gap-x-12 border-t-2 border-ink md:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="border-b border-rule py-5">
                <strong className="block text-lg font-extrabold">{feature.title}</strong>
                <span className="text-muted">{feature.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="built" aria-labelledby="built-heading" className="mx-auto max-w-[90rem] scroll-mt-20 px-5 pb-28 lg:px-12">
          <div className="grid gap-10 border-2 border-ink p-6 lg:grid-cols-[1fr_1.2fr] lg:p-10">
            <div>
              <h2 id="built-heading" className="text-3xl leading-none font-extrabold tracking-[-0.02em]">
                How it&rsquo;s built
              </h2>
              <p className="mt-4 max-w-md text-muted">
                ExpenseIt began as my BSc final year project, a native Android app in Kotlin. This is the rebuilt web
                version: the same idea, designed and engineered to be shipped.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={GITHUB} variant="secondary">
                  <CodeXml aria-hidden className="size-5" strokeWidth={2.5} />
                  Read the code
                </ButtonLink>
                <a href={`${GITHUB}/tree/v1-android-fyp`} className="self-center text-sm font-bold">
                  See the original Android app
                </a>
              </div>
            </div>
            <dl className="grid gap-0 text-base">
              {BUILT_WITH.map(([term, detail]) => (
                <div key={term} className="grid gap-1 border-b border-rule py-3 last:border-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="font-extrabold">{term}</dt>
                  <dd className="text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="close-heading" className="bg-cat-lime px-5 py-20 lg:px-12 lg:py-24">
          <div className="mx-auto flex max-w-[90rem] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="close-heading" className="max-w-3xl text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.9] font-extrabold tracking-[-0.04em]">
              See it with a month of sample spending.
            </h2>
            <div className="flex flex-wrap items-start gap-3">
              <DemoButton />
              {!user && (
                <ButtonLink href="/sign-up" variant="secondary" className="bg-transparent hover:bg-white/40">
                  Create an account
                  <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
                </ButtonLink>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-ink px-5 py-8 lg:px-12">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 text-sm">
          <p>
            <strong className="font-extrabold">ExpenseIt</strong> · Built by Rui
          </p>
          <a href={GITHUB} className="font-bold">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}

const FEATURES = [
  { title: "Split one receipt into several expenses", text: "Move the bleach out of the food shop. Discounts and tax are shared fairly, so it always adds up." },
  { title: "30 currencies, each day's rate", text: "Spend in euros on holiday; your totals stay in pounds at the European Central Bank's rate for that day." },
  { title: "Find anything", text: "Search by shop or note, filter by category and month." },
  { title: "Your categories, your colours", text: "Rename, recolour and reorder them. Deleting one never deletes the spending in it." },
  { title: "Receipts stay private", text: "Photos are stored privately, shown only to you, and deleted when you delete the receipt." },
  { title: "Any device", text: "It runs in the browser on your phone or your laptop, with the same data on both." },
];

const BUILT_WITH: Array<[string, string]> = [
  ["Next.js, TypeScript", "React server components and server actions, deployed on Vercel."],
  ["Postgres on Neon", "Drizzle ORM with versioned migrations; every query scoped to its owner."],
  ["Exact money", "Whole pennies and BigInt arithmetic, never floating point."],
  ["Gemini for receipts", "A strict JSON schema, validated, with automatic fallback between models."],
  ["Clean layers", "Domain rules, use cases and adapters kept apart, so any service can be swapped."],
  ["Tested", "Over 80 automated tests, run against a real in-memory Postgres."],
];

/**
 * The pocket of receipts: an overlapping heap at the foot of the "before",
 * anchored to the bottom edge so short laptop screens keep it clear of the
 * copy column. Slips right of the divider wait under the month until dragged.
 */
const DESKTOP_SLIPS: Array<{ slip: (typeof SLIPS)[number]; style: React.CSSProperties; tallOnly?: boolean }> = [
  { slip: SLIPS[1], style: { left: "47%", bottom: "275px", transform: "rotate(7deg)" } },
  { slip: SLIPS[4], style: { left: "40%", bottom: "190px", transform: "rotate(-8deg)" } },
  { slip: SLIPS[0], style: { left: "44%", bottom: "70px", transform: "rotate(3deg)" } },
  { slip: SLIPS[5], style: { left: "39.5%", bottom: "-30px", transform: "rotate(-6deg)" } },
  // Under the copy, only on screens tall enough to keep them clear of it.
  { slip: SLIPS[3], style: { left: "3%", bottom: "28px", transform: "rotate(6deg)" }, tallOnly: true },
  { slip: SLIPS[2], style: { left: "18%", bottom: "14px", transform: "rotate(-5deg)" }, tallOnly: true },
  // Waiting under the month until the divider is dragged.
  { slip: SLIPS[3], style: { left: "63%", bottom: "40px", transform: "rotate(-9deg)" } },
  { slip: SLIPS[2], style: { left: "72%", bottom: "-20px", transform: "rotate(6deg)" } },
  { slip: SLIPS[0], style: { left: "81%", bottom: "70px", transform: "rotate(-3deg)" } },
  { slip: SLIPS[5], style: { left: "89%", bottom: "-40px", transform: "rotate(12deg)" } },
];

const MOBILE_SLIPS = [
  { slip: SLIPS[0], style: { left: "4%", top: "5%", transform: "rotate(-6deg)" } },
  { slip: SLIPS[1], style: { left: "9%", top: "33%", transform: "rotate(7deg)" } },
  { slip: SLIPS[4], style: { left: "2%", top: "55%", transform: "rotate(-9deg)" } },
  { slip: SLIPS[2], style: { left: "11%", top: "70%", transform: "rotate(5deg)" } },
];
