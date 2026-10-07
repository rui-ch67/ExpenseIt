<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ExpenseIt conventions

- Product context lives in `PRODUCT.md`; read it before product or design work.
- Layers: `domain` (pure rules, no framework imports) ← `application` (services + ports in `ports.ts`) ← `infrastructure` (adapters) ← `server`/`app`. Never import infrastructure from domain or application.
- New dependencies on external systems get a port in `src/application/ports.ts` and an adapter in `src/infrastructure`, wired in `src/server/container.ts`.
- Money is `Money` (integer minor units). Never use floats for amounts. Dates are `IsoDate` calendar dates.
- Every repository method is scoped by `userId`.
- Schema changes: edit `src/infrastructure/db/schema.ts`, then `pnpm db:generate`. Never hand-edit applied migrations.
- Verify with `pnpm typecheck && pnpm lint && pnpm test` before committing.
