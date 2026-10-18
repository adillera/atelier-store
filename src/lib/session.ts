// Server-side session access. Pages, Server Actions and Route Handlers read
// the session only through these helpers.
//
// Every call reads the request's cookies, so with Cache Components the
// calling component must sit inside a <Suspense> boundary (and never at the
// top level of a layout).

import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { auth } from "@/lib/auth";

// One session lookup per request, however many components ask.
//
// connection() stops Next's prerender passes here. Those passes have cookies
// but abort uncached I/O when they finish, so without it the session query
// starts, gets aborted mid-flight and Better Auth logs it as a failed query.
export const getSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

// Signed-out visitors go to sign-in and come back to `returnTo` afterwards.
export async function requireUser(returnTo: string) {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return session.user;
}

// Non-admins get a 404 so the admin area doesn't advertise itself.
export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") notFound();
  return user;
}

// For Server Actions and Route Handlers. Pages use requireAdmin() (redirect /
// 404); actions can't rely on those, so this throws instead. Every admin
// action must call it as its first statement; `npm run lint` checks this.
export class ForbiddenError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "ForbiddenError";
  }
}

export async function requireAdminAction() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    console.warn("[admin] rejected action", { userId: session?.user.id ?? null });
    throw new ForbiddenError();
  }
  return session.user;
}

// Whether the current visitor is an admin, without redirecting. For deciding
// what chrome to render only; never a substitute for the guards above.
export async function isAdmin() {
  const session = await getSession();
  return session?.user.role === "admin";
}

// Only same-origin paths: "/account" yes, "//evil.com" or "https://…" no.
export function safeRedirectPath(value: unknown, fallback = "/account") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
