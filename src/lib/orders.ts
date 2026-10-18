// Orders for Stripe Checkout (tables in src/db/orders.ts).
//
// Rules this module enforces:
// - Prices and totals come from our database rows, never from the client.
// - Stock is reserved when the order is created and released exactly once
//   if it doesn't complete.
// - Only fulfillCheckout() marks an order paid, and only from a Checkout
//   Session retrieved from Stripe's API. It's called only by the Stripe
//   webhook, never from a page or route a browser can reach.
// - Every status change is a conditional UPDATE, so repeated or concurrent
//   calls (duplicate webhooks, retries) are harmless.

import "server-only";

import { randomInt } from "node:crypto";

import { and, eq, gt, inArray, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type Stripe from "stripe";

import { db } from "@/db";
import { products } from "@/db/catalog";
import { orderItems, orders, stripeEvents, type OrderShipping } from "@/db/orders";
import { violatedConstraint } from "@/lib/db-errors";
import { UNFINISHED_STATUSES } from "@/lib/order-status";
import { getStripe } from "@/lib/stripe";

export const CHECKOUT_MINUTES = 31; // Stripe's minimum session lifetime is 30.
const OPEN = ["pending", "processing"] as const;

export class OutOfStockError extends Error {}

// Whole minutes until `date`, at least 1 (for "reserved for about N minutes").
export function minutesUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000));
}

export type OrderLineInput = {
  productId: number;
  productName: string;
  unitPriceCents: number;
  quantity: number;
};

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
const newOrderNumber = () =>
  `AT-${Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

// Reserves stock and creates the order with its items in one transaction
// (db.batch on the Neon HTTP driver). Stock is decremented without a WHERE
// guard on purpose: if any line would go below zero, the products stock CHECK
// fails and nothing is written.
export async function createPendingOrder(userId: string, lines: OrderLineInput[]) {
  if (lines.length === 0) throw new Error("Cannot create an empty order");
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const expiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60_000);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = newOrderNumber();
    try {
      const statements: BatchItem<"pg">[] = [
        ...lines.map((line) =>
          db
            .update(products)
            .set({ stockQuantity: sql`${products.stockQuantity} - ${line.quantity}` })
            .where(eq(products.id, line.productId)),
        ),
        db.insert(orders).values({
          number,
          userId,
          subtotalCents,
          totalCents: subtotalCents,
          expiresAt,
        }),
        ...lines.map((line) =>
          db.insert(orderItems).values({
            orderId: sql`(SELECT id FROM orders WHERE number = ${number})`,
            productId: line.productId,
            productName: line.productName,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
          }),
        ),
      ];
      // Never empty: the order insert is always there.
      await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
      const order = await db.query.orders.findFirst({ where: eq(orders.number, number) });
      if (!order) throw new Error(`Order ${number} missing after insert`);
      return order;
    } catch (error) {
      const constraint = violatedConstraint(error);
      if (constraint === "products_stock_quantity_nonnegative") {
        throw new OutOfStockError("Not enough stock", { cause: error });
      }
      if (constraint !== "orders_number_unique") throw error;
      // Order number collision: try again with a new one.
    }
  }
  throw new Error("Could not allocate an order number");
}

export async function attachCheckoutSession(orderId: number, sessionId: string) {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(eq(orders.id, orderId));
}

// Moves an open order to a final unpaid status and returns its stock, in one
// statement: a duplicate or concurrent call finds the order no longer open
// and changes nothing. Returns whether this call released it.
export async function releaseOrder(
  orderId: number,
  status: "failed" | "expired" | "canceled",
) {
  const result = await db.execute(sql`
    WITH released AS (
      UPDATE orders SET status = ${status}, updated_at = now()
      WHERE id = ${orderId} AND status IN ('pending', 'processing')
      RETURNING id
    )
    UPDATE products p SET stock_quantity = p.stock_quantity + oi.quantity
    FROM order_items oi JOIN released r ON r.id = oi.order_id
    WHERE p.id = oi.product_id
    RETURNING p.id`);
  return result.rows.length > 0;
}

function shippingFrom(session: Stripe.Checkout.Session): OrderShipping | null {
  const details = session.collected_information?.shipping_details;
  if (!details) return null;
  return {
    name: details.name ?? null,
    address: {
      line1: details.address.line1 ?? null,
      line2: details.address.line2 ?? null,
      city: details.address.city ?? null,
      state: details.address.state ?? null,
      postalCode: details.address.postal_code ?? null,
      country: details.address.country ?? null,
    },
  };
}

export type FulfillResult =
  | "paid"
  | "already-final"
  | "processing"
  | "not-paid"
  | "unknown-session"
  | "mismatch";

// The only path to `paid`. Re-reads the session from Stripe, checks it
// belongs to our order and charged exactly our total, then flips the order
// with a conditional UPDATE.
export async function fulfillCheckout(sessionId: string): Promise<FulfillResult> {
  // Our order first: sessions we didn't create are ignored without a call.
  const order = await db.query.orders.findFirst({
    where: eq(orders.stripeCheckoutSessionId, sessionId),
  });
  if (!order) return "unknown-session";
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.metadata?.order_id !== String(order.id)) {
    console.error("Checkout session metadata does not match order", {
      sessionId: session.id,
      orderId: order.id,
    });
    return "mismatch";
  }

  if (session.payment_status !== "paid") {
    // Completed with a delayed payment method: keep stock reserved and wait
    // for checkout.session.async_payment_succeeded / _failed.
    if (session.status === "complete") {
      const moved = await db
        .update(orders)
        .set({ status: "processing" })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
        .returning({ id: orders.id });
      return moved.length > 0 ? "processing" : "already-final";
    }
    return "not-paid";
  }

  if (session.amount_total !== order.totalCents || session.currency !== order.currency) {
    console.error("Checkout session amount does not match order; leaving for review", {
      sessionId: session.id,
      orderId: order.id,
      stripe: { amount: session.amount_total, currency: session.currency },
      order: { amount: order.totalCents, currency: order.currency },
    });
    return "mismatch";
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) {
    console.error("Paid checkout session has no payment intent", { sessionId: session.id });
    return "mismatch";
  }

  const updated = await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      email: session.customer_details?.email ?? null,
      shipping: shippingFrom(session),
    })
    .where(and(eq(orders.id, order.id), inArray(orders.status, [...OPEN])))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    if (order.status !== "paid") {
      // Stripe says paid but we already closed the order (should not happen:
      // expired sessions can't be paid). Needs a human.
      console.error("Paid checkout session for a closed order; needs review", {
        sessionId: session.id,
        orderId: order.id,
        status: order.status,
      });
    }
    return "already-final";
  }
  return "paid";
}

// Ends an open order whose session we want gone (customer cancelled, or they
// started a new checkout). Expires the Stripe session first and only returns
// stock once Stripe confirms the session is expired. A session that was
// completed in the meantime is left alone ("completed"): its stock stays
// reserved and the webhook marks it paid.
export async function closeOpenOrder(order: {
  id: number;
  stripeCheckoutSessionId: string | null;
}): Promise<"canceled" | "completed" | "unchanged"> {
  if (!order.stripeCheckoutSessionId) {
    return (await releaseOrder(order.id, "canceled")) ? "canceled" : "unchanged";
  }
  const stripe = getStripe();
  try {
    await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
  } catch {
    // Already expired or completed; the retrieve below tells us which.
  }
  const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
  if (session.status === "expired") {
    return (await releaseOrder(order.id, "canceled")) ? "canceled" : "unchanged";
  }
  if (session.status === "complete") return "completed";
  return "unchanged";
}

// One open checkout per customer: starting a new one closes the old ones.
export async function closeOpenOrdersForUser(userId: string) {
  const open = await db.query.orders.findMany({
    columns: { id: true, stripeCheckoutSessionId: true },
    where: and(eq(orders.userId, userId), eq(orders.status, "pending")),
  });
  let changed = false;
  for (const order of open) {
    if ((await closeOpenOrder(order)) === "canceled") changed = true;
  }
  return changed;
}

// Safety net if an expiry webhook was missed: pending orders well past their
// session's expiry are checked against Stripe and closed. Bounded per call.
export async function releaseStaleOrders(limit = 5) {
  const stale = await db.query.orders.findMany({
    columns: { id: true, stripeCheckoutSessionId: true },
    where: and(
      eq(orders.status, "pending"),
      lt(orders.expiresAt, sql`now() - interval '5 minutes'`),
    ),
    limit,
  });
  let changed = false;
  for (const order of stale) {
    try {
      const result = await closeOpenOrder(order);
      if (result === "canceled") changed = true;
      if (result === "completed") {
        // Paid but no webhook yet (Stripe retries for days). Flag it.
        console.warn("Stale pending order has a completed session", order.id);
      }
    } catch (error) {
      console.error("Could not close stale order", order.id, error);
    }
  }
  return changed;
}

// The customer's checkout that's still open on Stripe, if any, with the
// quantities it holds in reserve (so the bag can count them as available).
export async function getOpenCheckout(userId: string) {
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.userId, userId),
      eq(orders.status, "pending"),
      isNotNull(orders.stripeCheckoutSessionId),
      gt(orders.expiresAt, sql`now()`),
    ),
    with: { items: true },
    orderBy: (order, { desc }) => [desc(order.createdAt)],
  });
  if (!order) return undefined;
  return {
    number: order.number,
    sessionId: order.stripeCheckoutSessionId!,
    minutesLeft: minutesUntil(order.expiresAt),
    totalCents: order.totalCents,
    reserved: new Map(order.items.map((item) => [item.productId, item.quantity])),
  };
}

export async function getOrderBySessionForUser(sessionId: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)),
    with: { items: true },
  });
}

export async function getOrderForUser(number: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.number, number), eq(orders.userId, userId)),
    with: {
      items: {
        orderBy: (item, { asc }) => [asc(item.id)],
        with: {
          product: { columns: { slug: true, imageUrl: true, imageAlt: true } },
        },
      },
    },
  });
}

export type OrderSummary = Awaited<ReturnType<typeof getOrdersForUser>>[number];

// Order history for one customer, newest first. Always scoped by userId.
export async function getOrdersForUser(
  userId: string,
  { includeUnfinished = false, limit = 50 } = {},
) {
  const rows = await db.query.orders.findMany({
    columns: {
      number: true,
      status: true,
      totalCents: true,
      createdAt: true,
      paidAt: true,
    },
    where: includeUnfinished
      ? eq(orders.userId, userId)
      : and(eq(orders.userId, userId), notInArray(orders.status, UNFINISHED_STATUSES)),
    orderBy: (order, { desc }) => [desc(order.createdAt), desc(order.id)],
    limit,
    with: {
      items: {
        columns: { productName: true, quantity: true },
        orderBy: (item, { asc }) => [asc(item.id)],
        with: { product: { columns: { imageUrl: true } } },
      },
    },
  });
  return rows.map((row) => ({
    number: row.number,
    status: row.status,
    totalCents: row.totalCents,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    names: row.items.map((item) => item.productName),
    image: row.items[0]?.product.imageUrl ?? null,
  }));
}

export async function countUnfinishedOrders(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, UNFINISHED_STATUSES)));
  return row?.count ?? 0;
}

export async function getOrderBySession(sessionId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.stripeCheckoutSessionId, sessionId),
  });
}

// Webhook dedupe log. Recorded only after an event was handled successfully,
// so a failed attempt is retried by Stripe.
export async function isEventProcessed(eventId: string) {
  const row = await db.query.stripeEvents.findFirst({
    columns: { id: true },
    where: eq(stripeEvents.eventId, eventId),
  });
  return Boolean(row);
}

export async function recordEvent(eventId: string, type: string) {
  await db.insert(stripeEvents).values({ eventId, type }).onConflictDoNothing();
}
