import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "Atelier",
  // The Neon HTTP driver has no interactive transactions; the adapter's
  // `transaction` option defaults to false, which is what we need.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false keeps sign-up and update requests from setting the role.
      // Promote admins with `npm run auth:make-admin -- <email>`.
      role: {
        type: ["customer", "admin"],
        required: true,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // extend the expiry at most once a day
    // No cookieCache: every check reads the session row, so sign-out and
    // role changes apply on the next request.
  },
  // nextCookies must be the last plugin in the array.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
