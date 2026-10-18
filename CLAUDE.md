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
npm run auth:make-admin -- <email> [--revoke]  # grant/remove the admin role (no UI path)
npm run db:generate    # drizzle-kit: create SQL migration in ./drizzle from the schema files
npm run db:migrate     # apply migrations to Neon
npm run db:seed        # upsert the launch catalog (categories, products, stock); resets seeded rows
npm run db:push        # push schema directly, skipping migrations (prototyping only)
npm run db:studio      # Drizzle Studio
```

No test framework is set up yet.

First-time setup: `cp .env.example .env.local`, fill in `DATABASE_URL` (Neon **pooled** connection string), `BETTER_AUTH_SECRET` (`openssl rand -base64 32`; `next build`/`next start` refuse the default secret) and `BETTER_AUTH_URL`, then run `db:migrate` → `db:seed`. After changing auth config or plugins: `auth:generate` → `db:generate` → `db:migrate`.

## Architecture

Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4, Better Auth, Drizzle ORM, Neon Postgres. Path alias `@/*` → `src/*`.

How the pieces connect:

- `src/db/index.ts` uses the Neon **HTTP** driver (`drizzle-orm/neon-http`) — no interactive transactions. It throws at import time if `DATABASE_URL` is missing, so anything importing `@/db` or `@/lib/auth` needs env set.
- `src/lib/auth.ts` is the server Better Auth instance (`auth.api.*` for server-side session checks). The `nextCookies()` plugin must remain the **last** plugin. Only email/password is enabled (no OAuth, reset, verification or 2FA yet). Sessions are DB rows (30 days, rolling) with no cookie cache, so sign-out and role changes apply on the next request. `user.role` (`customer` | `admin`) is an `additionalField` with `input: false`, so clients can't set it.
- `src/lib/session.ts` is the only way to read the session: `getSession()` (React-`cache`d per request), `requireUser(returnTo)` (redirects to `/sign-in?next=`), `requireAdmin()` (404s non-admins), `safeRedirectPath()` for `next` values. They read cookies, so call them inside `<Suspense>`, never at a layout's top level. `getSession()` awaits `connection()` first: Next's prerender passes abort uncached I/O, and without it Better Auth logs every aborted session query as an error. Sign-out ends with a full page load (`AccountNav`) because Next keeps visited pages mounted (hidden), which would otherwise leave the account's details in the DOM. Every Server Action and Route Handler must call them itself; a page check doesn't protect them.
- `src/app/(auth)/actions.ts` holds the sign-up/in/out Server Actions. Sign-in/up post through `auth.handler` (not `auth.api.*`) because Better Auth's rate limiter only runs in its HTTP handler; they copy the session cookie themselves. Validation rules shared by the form and the actions live in `src/lib/auth-validation.ts`. `/account` is customer-only and `/admin` admin-only.
- `src/app/api/auth/[...all]/route.ts` mounts Better Auth at `/api/auth/*` via `toNextJsHandler`.
- `src/lib/auth-client.ts` is the browser client (`better-auth/react`), pointed at `NEXT_PUBLIC_APP_URL`. Unused so far: the forms use Server Actions.
- `drizzle.config.ts` loads env from `.env.local` (not `.env`).

## Database conventions

- **Scope:** the catalog is only `categories` 1→N `products`, with stock as a column, plus a cookie-based bag (below). Ask before adding reviews, wishlists or variants.
- **Orders (`src/db/orders.ts`), for Stripe Checkout:** `orders` belong to a signed-in `user` (RESTRICT) and have a public `number` (`AT-XXXXXXXX`, used in URLs). `status` (`order_status` enum: `pending` → `processing` → `paid`, or `failed`/`expired`/`canceled`) is the payment state. Stripe ids are explicit unique columns (`stripe_checkout_session_id`, `stripe_payment_intent_id`). CHECKs: `total_cents = subtotal_cents + tax_cents`, a `paid` order must have `paid_at` plus both Stripe ids, `paid_at` only when paid. `order_items` snapshot `product_name` and `unit_price_cents` at checkout (unique per order+product, quantity > 0). `stripe_events.event_id` is unique for webhook dedupe. Patterns (verified): reserve stock and insert the order in one `db.batch()` (a Neon transaction) whose unguarded `stock_quantity - n` lets the stock CHECK reject oversells; change status only with conditional `UPDATE … WHERE status IN (…)`; release stock in one `WITH released AS (UPDATE orders …) UPDATE products …` statement so duplicates can't release twice.
- **Bag (cart):** no tables. An HTTP-only `atelier_bag` cookie holds only `[[productId, quantity], …]` (`src/lib/cart-items.ts`: parse/serialize, max 20 lines). `src/lib/cart.ts` `getBag()` joins it against `getProductsForBag()` (deliberately **uncached**, after `connection()`) so prices and stock are always current; quantities are clamped to stock and sold-out lines excluded from the subtotal. Mutations are the Server Actions in `src/app/bag/actions.ts`: they accept only a product id and quantity (never a price), re-read stock, and clean the whole cookie on every write. Stock is not reserved by a bag; decrement it at checkout. The header badge reads the cookie only (no DB), so it can overcount until the next bag write.
- **Where tables live:** `src/db/schema.ts` is Better Auth only, because `auth:generate` overwrites it. App tables go in `src/db/catalog.ts` / `src/db/orders.ts`, or in a new file that is also added to `drizzle.config.ts` `schema` and merged in `src/db/index.ts`. Schema files use relative imports only, because drizzle-kit loads them directly.
- **Auth tables are the exception:** Better Auth's `user`/`session`/`account`/`verification` keep its text IDs and `ON DELETE CASCADE` FKs. Constraints it can't generate (e.g. `user_role_check`) go in a custom migration (`npx drizzle-kit generate --custom`).
- **Keys:** every app table has an `integer` identity PK. Anything that appears in a URL gets a unique `slug`, and routes use the slug, never the id (`/products/[slug]`).
- **Money:** store integer cents in `*_cents` columns. `formatPrice(cents)` in `src/lib/catalog.ts` does the display.
- **Stock:** `products.stock_quantity` has `CHECK (>= 0)`. The Neon HTTP driver has no interactive transactions, so decrement in one conditional statement (`SET stock_quantity = stock_quantity - n WHERE stock_quantity >= n`), never read-then-write.
- **Constraints:** FKs use `ON DELETE RESTRICT`. Enforce invariants with DB `CHECK` constraints, not only in app code.
- **Schema changes:** run `db:generate`, review the SQL in `./drizzle`, then `db:migrate`, and commit the migration. Don't use `db:push` except for throwaway prototyping.
- **Reads:** the storefront reads products only through `src/lib/products.ts`. Each query (except `getProductsForBag`) uses `'use cache'` + `cacheLife('minutes')` + `cacheTag('products')` and returns the `Product` view type, so components never see table rows. Any write must call `revalidateTag('products')`.
- **Seed data:** it lives in `src/db/seed.ts`, not in app code. `db:seed` upserts by slug and resets seeded rows, including stock.
- **Build:** `next build` queries the DB (`generateStaticParams`, home page), so it needs `DATABASE_URL` and a seeded database.

## Checkout (Stripe)

- Hosted Stripe Checkout, Node SDK `stripe` with API version `2026-09-30.endive`; `src/lib/stripe.ts` creates the client lazily. Env: `STRIPE_SECRET_KEY` (use a restricted `rk_test_` key from a sandbox) and `STRIPE_WEBHOOK_SECRET` (from `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally, or the Dashboard endpoint). Never pass `payment_method_types`.
- Flow: bag Checkout button → `startCheckout` (`src/app/checkout/actions.ts`): `requireUser`, fresh `getBag()` (refuses sold-out/changed lines), closes the customer's other open orders, `createPendingOrder` (reserves stock + snapshots DB prices in one transaction), then creates the Checkout Session from the **order rows** (`price_data`, `expires_at` 31 min, US shipping, metadata `order_id`) with idempotency key `checkout-<number>`. Stripe failure → `releaseOrder(…, "canceled")`.
- **Only the webhook marks orders paid.** `src/app/api/stripe/webhook/route.ts` verifies the signature, skips event ids already in `stripe_events`, and calls `fulfillCheckout()` (`src/lib/orders.ts`), which re-retrieves the session from Stripe and checks order id, `payment_status`, `amount_total` and currency before a conditional `UPDATE … SET status='paid'`. `expired` / `async_payment_failed` call `releaseOrder()`. Events are recorded only after success (a 500 makes Stripe retry).
- `/checkout/complete` (success_url) never writes order status: it checks ownership and, if Stripe says the session is complete, removes purchased items from the bag, then shows `/checkout/success/[number]` (owner-only, polls while `pending`). `/checkout/cancel` expires the session and releases stock immediately; a session that completed meanwhile is left to the webhook.
- A customer's own open checkout holds stock, so `startCheckout` closes it **before** revalidating the bag, and the bag page passes its reserved quantities to `getBag(reserved)` (from `getOpenCheckout()`), shows a "checkout still open" banner (Return to Payment / Cancel Checkout, plain `<a>` links, never prefetched), and `/checkout/cancel` reports `?checkout=canceled|expired|failed`.
- Order history: `/account/orders` (`getOrdersForUser`, always scoped by user id; cancelled/expired checkouts hidden unless `?show=all`) and `/account/orders/[number]`. Both order pages render `src/components/order-view.tsx` (`context="checkout" | "account"`), which looks orders up by number **and** user id (404 otherwise). Status labels live in `src/lib/order-status.ts`. The account nav reads `usePathname()`, so the layout wraps it in `<Suspense>` (required for the dynamic `[number]` route).
- Stock writes in actions call `updateTag("products")`; in route handlers `revalidateTag("products", "max")`.

## Admin

- Routes live under `src/app/admin/` (overview, products, stock, categories, orders). Access control is **per page and per action**, never the layout: layouts don't re-render on client navigation, so a layout check can't protect its children.
  - Every admin `page.tsx` calls `await requireAdmin("/admin/…")` inside `<Suspense>` (signed out → sign-in, non-admin → 404).
  - Every exported function in an admin `"use server"` file (and any inline server action or `route.ts` handler under `src/app/admin` / `src/app/api/admin`) must start with `await requireAdminAction()` (`src/lib/session.ts`), which throws `ForbiddenError`.
  - `npm run lint` runs `scripts/check-admin-guards.mjs`, which fails the build on any missing guard.
- The admin layout only *draws* chrome for admins (`isAdmin()`); non-admins get the bare page so its guard responds. Hiding links (e.g. the account overview's Admin link) is convenience, never protection.
- Products (`/admin/products`, `/new`, `/[slug]`): data access in `src/lib/admin.ts` (`server-only`, uncached, no auth inside: callers guard). Validation in `src/lib/admin-validation.ts` is shared by the form and `src/app/admin/products/actions.ts`, which re-validates everything server-side (prices in dollars → cents, Unsplash-only image URLs because of `next.config.ts` `remotePatterns`, slug format, category must exist). "Availability" is stock: the form writes `stock_quantity` only if it changed, with `WHERE stock_quantity = <value the admin saw>`, so it can't clobber checkout reservations; a mismatch returns "Stock changed to N". Writes call `updateTag("products")`. (Actions read fields normally, e.g. `formData.get("price")`; only the raw request body prefixes them as `_1_price`, which matters to tests that replay action requests.)
- Shared nav: `src/components/side-nav.tsx` (account and admin). Values shared between a `"use client"` module and server code go in a plain module (e.g. `admin-sections.ts`): client-module exports are references on the server.

## Next.js config notes

`next.config.ts` enables `cacheComponents` and `partialPrefetching`: uncached/dynamic data must be read inside `<Suspense>` boundaries, and `<Link>` prefetches a per-route App Shell. Read `node_modules/next/dist/docs/` (e.g. `01-app/01-getting-started/08-caching.md`, `01-app/02-guides/prefetching.md`) before writing data-fetching or routing code.

Tailwind v4 is wired through a Turbopack loader rule (`@tailwindcss/turbopack`) in `next.config.ts`, not a PostCSS config. Theme tokens live in `src/app/globals.css` (`@theme inline`).
