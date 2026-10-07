# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first, installable as a PWA so it behaves like an app on a phone, and fully usable on desktop. The original native Android app (Kotlin, Jetpack Compose, BSc final year project 2024/25) is archived under the git tag `v1-android-fyp` and is no longer developed.

## Stack

- Next.js + TypeScript, deployed on Vercel.
- Neon Postgres for data (scales to zero when idle, wakes on the next request, so the portfolio link always works).
- Vercel Blob for receipt images (1 GB on the free plan).
- Authentication inside the app (Auth.js or Better Auth; library not yet chosen).
- Receipt OCR: Google Gemini on the free AI Studio tier (3.5 Flash, falling back to 3.1 Flash-Lite and 3.5 Flash-Lite), called only from the server and behind a provider interface so it can be swapped.

Every service must stay on a free tier. Scale is not a goal.

## Users

Primary: students and young professionals tracking everyday spending (groceries, eating out, transport, subscriptions), mostly on their phone, often right after paying.

Secondary: portfolio visitors (recruiters, interviewers, peers) opening a shared link to judge the product and its engineering. They will not sign up, so a one-click demo account with realistic sample data is how they experience it.

## Product Purpose

ExpenseIt makes logging spending fast and shows people where their money goes. Snap or upload a receipt, AI pulls out the merchant, date, total and line items, and the user reviews it and saves it as an expense. Manual entry is always available.

Success means logging a purchase takes seconds, users can answer "where did my money go this month?" at a glance, and a portfolio visitor understands the product within a minute of opening the demo.

## Positioning

Receipt-first: the receipt image and its itemised contents stay attached to the expense, rather than reducing every purchase to a single number. (Provisional; refine once the product is built.)

## Operating Context

- Capture happens on a phone at or just after the till: camera or photo library, one receipt at a time.
- Review and analysis happen on phone or laptop: monthly overviews, category breakdowns, budgets.
- Portfolio viewing happens through a shared link, often on a recruiter's laptop, with no sign-up.

## Capabilities and Constraints

Confirmed scope:
- Expenses: create, edit, delete, with title, amount, category, date, note, and an optional linked receipt.
- Receipt scanning: photo capture or upload, light preprocessing in the browser (orientation, resizing, compression), AI extraction, a review screen before saving, receipt image kept with the record.
- Categories: customisable, ordered, colour-coded. Deleting a category must not delete its expenses.
- Statistics: monthly spending, category breakdown, month-over-month comparison.
- Monthly budgets per category and overall, with remaining amounts and overspend warnings.
- Recurring expenses and subscriptions, logged automatically each period, with upcoming charges listed.
- Search, filters (date, category, amount) and CSV export.
- Splitting a receipt across categories: on the receipt review screen every item starts in one category, and the user can move individual items to others. Saving creates one expense per category, all linked to the same receipt. Discounts, tax and any gap between the item sum and the receipt total are shared out in proportion to item prices, so the expenses always add up to exactly the receipt total. Receipts that aren't split behave as before: one expense.
- Multi-currency: each user has a home currency (ISO 4217 code); expenses can be logged in any currency and are converted to the home currency using daily exchange rates (rate source not yet chosen).
- Accounts with sign-in, plus a one-click demo account.

Constraints:
- API keys stay on the server. No secret is ever shipped to the browser or committed to the repo.
- Money is handled as exact decimals, never floating point.
- The Gemini free tier has a small daily quota, so scanning must be rate-limited, especially for the shared demo account.
- Code follows SOLID principles and stays easy to read. Keep the original Kotlin design (MVVM, repositories, dependency injection) as the conceptual model where it still fits.

Not yet decided:
- Authentication library and sign-in methods (email, Google, or both).
- Exchange-rate data source.

## Brand Commitments

- The product name is **ExpenseIt**.
- The v1 logo (a wallet with a coin) is kept at `docs/brand/expenseit-logo-v1.svg`, converted from the Android project. Whether it stays is undecided.
- The old Android colour scheme and typography are not binding. The visual identity is being redesigned.

## Evidence on Hand

- The original Android source, its tests and test reports (git tag `v1-android-fyp`).
- A synthetic test receipt (`src/test/fixtures/receipt-grocer.jpg`, fictional shop) that every configured Gemini model reads perfectly. It can double as the demo's "try a sample receipt" image.
- No real users, testimonials, usage statistics, or press. Do not invent any. Demo data must be clearly sample data.

## Product Principles

1. **Capture in seconds.** Scanning or typing a purchase should never be the slow part.
2. **Trust the numbers.** Totals are exact, and AI-extracted data is always shown for review and stays editable.
3. **Show where money goes**, not only how much was spent.
4. **Always demo-ready.** A stranger with a link should understand the product in a minute, with no setup.
5. **Your data is yours.** Export at any time; deleting something deletes it everywhere, including stored images.
