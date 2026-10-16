# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint (next core-web-vitals + typescript)
npm run typecheck    # tsc --noEmit

npm run auth:generate  # Better Auth CLI: writes auth tables INTO src/db/schema.ts
npm run db:generate    # drizzle-kit: create SQL migration in ./drizzle from the schema files
npm run db:migrate     # apply migrations to Neon
npm run db:seed        # upsert the launch catalog (categories, products, stock); resets seeded rows
npm run db:push        # push schema directly, skipping migrations (prototyping only)
npm run db:studio      # Drizzle Studio
```

No test framework is set up yet.

First-time setup: `cp .env.example .env.local`, fill in `DATABASE_URL` (Neon **pooled** connection string) and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), then run `db:migrate` → `db:seed`. (`auth:generate` → `db:generate` → `db:migrate` once auth tables are needed.)

## Architecture

Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4, Better Auth, Drizzle ORM, Neon Postgres. Path alias `@/*` → `src/*`.

How the pieces connect:

- `src/db/index.ts` uses the Neon **HTTP** driver (`drizzle-orm/neon-http`) — no interactive transactions. It throws at import time if `DATABASE_URL` is missing, so anything importing `@/db` or `@/lib/auth` needs env set.
- `src/lib/auth.ts` is the server Better Auth instance (`auth.api.*` for server-side session checks). The `nextCookies()` plugin must remain the **last** plugin. No sign-in methods (email/password, OAuth) are enabled yet.
- `src/app/api/auth/[...all]/route.ts` mounts Better Auth at `/api/auth/*` via `toNextJsHandler`.
- `src/lib/auth-client.ts` is the browser client (`better-auth/react`), pointed at `NEXT_PUBLIC_APP_URL`.
- `drizzle.config.ts` loads env from `.env.local` (not `.env`).

## Database conventions

- **Scope:** the catalog is only `categories` 1→N `products`, with stock as a column. Ask before adding carts, orders, payments, reviews, wishlists or variants.
- **Where tables live:** `src/db/schema.ts` is Better Auth only, because `auth:generate` overwrites it. App tables go in `src/db/catalog.ts`, or in a new file that is also added to `drizzle.config.ts` `schema` and merged in `src/db/index.ts`. Schema files use relative imports only, because drizzle-kit loads them directly.
- **Keys:** every table has an `integer` identity PK. Anything that appears in a URL gets a unique `slug`, and routes use the slug, never the id (`/products/[slug]`).
- **Money:** store integer cents in `*_cents` columns. `formatPrice(cents)` in `src/lib/catalog.ts` does the display.
- **Stock:** `products.stock_quantity` has `CHECK (>= 0)`. The Neon HTTP driver has no interactive transactions, so decrement in one conditional statement (`SET stock_quantity = stock_quantity - n WHERE stock_quantity >= n`), never read-then-write.
- **Constraints:** FKs use `ON DELETE RESTRICT`. Enforce invariants with DB `CHECK` constraints, not only in app code.
- **Schema changes:** run `db:generate`, review the SQL in `./drizzle`, then `db:migrate`, and commit the migration. Don't use `db:push` except for throwaway prototyping.
- **Reads:** the storefront reads products only through `src/lib/products.ts`. Each query uses `'use cache'` + `cacheLife('minutes')` + `cacheTag('products')` and returns the `Product` view type, so components never see table rows. Any write must call `revalidateTag('products')`.
- **Seed data:** it lives in `src/db/seed.ts`, not in app code. `db:seed` upserts by slug and resets seeded rows, including stock.
- **Build:** `next build` queries the DB (`generateStaticParams`, home page), so it needs `DATABASE_URL` and a seeded database.

## Next.js config notes

`next.config.ts` enables `cacheComponents` and `partialPrefetching`: uncached/dynamic data must be read inside `<Suspense>` boundaries, and `<Link>` prefetches a per-route App Shell. Read `node_modules/next/dist/docs/` (e.g. `01-app/01-getting-started/08-caching.md`, `01-app/02-guides/prefetching.md`) before writing data-fetching or routing code.

Tailwind v4 is wired through a Turbopack loader rule (`@tailwindcss/turbopack`) in `next.config.ts`, not a PostCSS config. Theme tokens live in `src/app/globals.css` (`@theme inline`).
