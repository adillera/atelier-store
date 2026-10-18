// Stripe webhook endpoint: the only place payment outcomes are applied.
// Browser redirects (/checkout/complete) never change order or payment state.
//
// - The signature is verified against the raw body (STRIPE_WEBHOOK_SECRET)
//   before anything else is read or written.
// - Only the four Checkout Session events below are processed; anything else
//   is acknowledged and ignored without touching the database.
// - Already-recorded event ids are acknowledged without reprocessing.
// - Handlers are idempotent (conditional status updates), and the event is
//   recorded only after success; a 500 makes Stripe retry.
//
// Subscribe the endpoint to exactly these events in Stripe.

import { revalidateTag } from "next/cache";
import type Stripe from "stripe";

import {
  fulfillCheckout,
  getOrderBySession,
  isEventProcessed,
  recordEvent,
  releaseOrder,
} from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      // fulfillCheckout re-reads the session from Stripe and checks it.
      const result = await fulfillCheckout(event.data.object.id);
      console.info(`[stripe] ${event.type} ${event.data.object.id}: ${result}`);
      return;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const order = await getOrderBySession(event.data.object.id);
      if (!order) return;
      const status = event.type === "checkout.session.expired" ? "expired" : "failed";
      // No-op if the order is already paid or closed (late or repeated event).
      const released = await releaseOrder(order.id, status);
      if (released) revalidateTag("products", "max");
      console.info(
        `[stripe] ${event.type} order ${order.number}: ${released ? status : "no change"}`,
      );
      return;
    }
    default:
      return;
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return Response.json({ received: true, ignored: true });
  }

  if (await isEventProcessed(event.id)) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handle(event);
  } catch (error) {
    console.error(`[stripe] failed to handle ${event.type} ${event.id}`, error);
    return new Response("Handler error", { status: 500 });
  }

  await recordEvent(event.id, event.type);
  return Response.json({ received: true });
}
