// Grants (or with --revoke, removes) the admin role for an existing user.
// There is no UI path to become an admin.
//
//   npm run auth:make-admin -- someone@example.com
//   npm run auth:make-admin -- someone@example.com --revoke
//
// Takes effect on the user's next request: sessions aren't cookie-cached.

import { eq } from "drizzle-orm";

import { db } from "./index";
import { user } from "./schema";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((arg) => !arg.startsWith("--"));
  if (!email) {
    throw new Error("Usage: npm run auth:make-admin -- <email> [--revoke]");
  }

  const role = revoke ? "customer" : "admin";
  const rows = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email))
    .returning({ email: user.email });

  if (rows.length === 0) {
    throw new Error(`No user with email ${email}. Sign up first.`);
  }
  console.log(`${email} is now ${role === "admin" ? "an admin" : "a customer"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
