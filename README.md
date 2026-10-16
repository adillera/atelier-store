# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS, with Better Auth, Drizzle ORM and Neon Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run auth:generate        # write Better Auth tables into src/db/schema.ts
npm run db:generate          # create SQL migration in ./drizzle
npm run db:migrate           # apply it to Neon
npm run dev
```

## Structure

```
src/
  app/
    api/auth/[...all]/route.ts  Better Auth route handler
    layout.tsx, page.tsx
  db/
    index.ts                    Drizzle client (Neon HTTP driver)
    schema.ts                   Drizzle tables
  lib/
    auth.ts                     Better Auth server instance
    auth-client.ts              Better Auth React client
drizzle.config.ts               drizzle-kit config
drizzle/                        generated migrations
```

## Scripts

| Script | Description |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `auth:generate` | Generate Better Auth tables into the Drizzle schema |
| `db:generate` / `db:migrate` | Create / apply migrations |
| `db:push` | Push schema directly (prototyping) |
| `db:studio` | Drizzle Studio |
