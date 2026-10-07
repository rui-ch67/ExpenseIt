# ExpenseIt

Snap a receipt, see where your money goes.

ExpenseIt is a personal expense tracker with AI receipt scanning, budgets, recurring payments and multi-currency support. It runs in any browser and installs on a phone like an app.

> **Status:** v2 is being rebuilt as a web app on the `v2-web` branch. The original native Android app (Kotlin, Jetpack Compose), built as my BSc final year project, is preserved at the [`v1-android-fyp`](https://github.com/rui-ch67/ExpenseIt/tree/v1-android-fyp) tag.

## Tech stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Database | Postgres on Neon, Drizzle ORM, SQL migrations in `drizzle/` |
| Sign-in | Better Auth: email and password, plus a one-click demo account |
| Receipt OCR | Google Gemini (free tier), behind a swappable interface |
| Receipt images | Vercel Blob (private) |
| Exchange rates | Frankfurter (European Central Bank reference rates) |
| Tests | Vitest, with an in-memory Postgres (PGlite) for integration tests |
| Hosting | Vercel (London region) |

## Architecture

The code is split into layers, and each layer depends only on the ones below it:

```
src/
├── domain/          Pure business rules: Money, dates, currencies, entities. No framework code.
├── application/     Use cases (services) and the interfaces (ports) they need.
├── infrastructure/  Adapters that implement those interfaces: Drizzle repositories,
│                    the exchange-rate API, and later the Gemini OCR and Blob storage.
├── server/          Composition root (container.ts), auth and session helpers.
└── app/             Next.js routes and UI.
```

- **Dependency inversion.** Services depend on interfaces such as `ExpenseRepository` and `ExchangeRateProvider`, never on Postgres or a specific API. `src/server/container.ts` wires the concrete classes together, the role Hilt's `AppModule` played in the Android version. Tests use the same wiring with an in-memory database and fixed exchange rates.
- **Exact money.** Amounts are integers in minor units (pence, cents). Splitting and currency conversion use integer and BigInt arithmetic with one explicit rounding step.
- **Ownership by construction.** Every repository method takes a `userId`, so one user can't read or change another user's data.
- **Calendar dates.** Expenses store the day they happened (`2026-10-07`), not a timestamp, so month totals never shift because of time zones.

### Receipt scanning

```
phone camera ─► browser: fix rotation, resize to 2000 px, JPEG ─► POST /api/receipts
   ─► check daily scan limit ─► save photo to private Blob ─► Gemini reads it (JSON schema)
   ─► validate ─► review screen ─► one expense, or one per category when items are split
```

- **No public upload step.** v1 uploaded each photo to Firebase only so Azure could fetch it by URL. Gemini takes the image inline, and photos are stored in a *private* Blob store, served only to their owner.
- **Structured output.** The model must answer in a fixed JSON schema with amounts as decimal strings, which are validated before use. Anything unreadable becomes blank for the user to fill in, rather than a guess.
- **Model fallback.** Free tiers have daily quotas and occasional overloads, so the extractor tries `gemini-3.5-flash`, then `gemini-3.1-flash-lite`, then `gemini-3.5-flash-lite`. All three read the test receipt in `src/test/fixtures/` perfectly. It is tilted, with a weighed item and a multi-buy saving.
- **Daily limits.** 25 scans per account, 5 per demo account and 300 in total per day, enforced with atomic counters in Postgres.
- **Split receipts.** Items can be moved to other categories; discounts and tax are shared out in proportion, so the expenses always add up to exactly the receipt total (`src/domain/receipt-split.ts`).

### What changed from v1

v2 fixes these issues from the Android version:

- Deleting a category no longer deletes its expenses; they become uncategorised.
- Editing an expense keeps its link to the receipt.
- Database migrations are generated from the schema and versioned, replacing v1's mislabelled hand-written migrations and destructive fallback.
- API keys stay on the server. v1 bundled the OCR key into the app.
- Receipts can be rescanned and split across categories; both were unfinished TODOs in v1.
- Deleting a receipt deletes its photo. v1 left every photo in Firebase forever.

## Getting started

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values (see comments in the file)
pnpm db:migrate              # create the tables in your database
pnpm dev                     # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm test` | Run unit and integration tests (no database or network needed) |
| `pnpm typecheck` | Type-check the whole project |
| `pnpm lint` | Lint |
| `pnpm db:generate` | Create a new migration after changing `src/infrastructure/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to the database in `DATABASE_URL` |
| `pnpm ocr:try <image> [model…]` | Read a receipt photo with Gemini and print what each model found |
| `pnpm smoke:receipts` | End-to-end check of scanning against the real database, Blob and Gemini (cleans up after itself) |

Deployments on Vercel run `vercel-build`, which applies pending migrations before building, so the production database schema always matches the code being deployed.
