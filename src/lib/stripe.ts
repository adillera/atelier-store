// Server-side Stripe client. Created lazily so builds and pages that never
// touch payments don't need STRIPE_SECRET_KEY.

import "server-only";

import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, {
      apiVersion: "2026-09-30.endive",
      appInfo: { name: "Atelier Store" },
    });
  }
  return client;
}

// Tags our Checkout Sessions in the Stripe Dashboard.
export const CHECKOUT_INTEGRATION_ID = "atelier-checkout-qkzmvtra";
