"use server";

// Starts Stripe Checkout for the signed-in customer's bag. The browser sends
// nothing but the form submission: lines, prices and totals are rebuilt here
// from the database, and Stripe is given exactly what the order rows say.

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getBag, writeCartItems } from "@/lib/cart";
import {
  attachCheckoutSession,
  closeOpenOrdersForUser,
  createPendingOrder,
  getOrderForUser,
  OutOfStockError,
  releaseOrder,
  releaseStaleOrders,
} from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { CHECKOUT_INTEGRATION_ID, getStripe } from "@/lib/stripe";

export type CheckoutState = { error?: string; key?: number };

const fail = (error: string): CheckoutState => ({ error, key: Date.now() });

async function siteOrigin() {
  const incoming = await headers();
  const protocol = incoming.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${incoming.get("host")}`;
}

export async function startCheckout(): Promise<CheckoutState> {
  // Guests sign in first and come back to the bag (the cookie is kept).
  const user = await requireUser("/bag");

  // 1. Close this customer's own open checkout first, so stock it holds
  //    counts as available below. Also tidy up any abandoned ones.
  const closedOwn = await closeOpenOrdersForUser(user.id);
  const closedStale = await releaseStaleOrders();
  if (closedOwn || closedStale) updateTag("products");

  // 2. Revalidate the bag against current prices and stock.
  const bag = await getBag();
  if (bag.lines.length === 0) return fail("Your bag is empty.");

  if (bag.lines.some((line) => !line.available)) {
    return fail("Remove sold-out pieces from your bag before checking out.");
  }
  if (bag.lines.some((line) => line.notice)) {
    // Save the corrected quantities so the bag shows what will be ordered.
    await writeCartItems(
      bag.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    );
    return fail(
      "Availability changed, so we've updated your bag. Please review it and check out again.",
    );
  }

  // 3. Reserve stock and create the order from database prices.
  let order;
  try {
    order = await createPendingOrder(
      user.id,
      bag.lines.map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        unitPriceCents: line.product.priceCents,
        quantity: line.quantity,
      })),
    );
  } catch (error) {
    if (error instanceof OutOfStockError) {
      updateTag("products");
      return fail("Someone just bought one of these pieces. Please review your bag.");
    }
    throw error;
  }

  // 4. Create the Stripe Checkout Session from the order rows.
  let url: string;
  try {
    const origin = await siteOrigin();
    const imageFor = new Map(bag.lines.map((line) => [line.product.id, line.product.image]));
    // Line items come from the stored order, not the bag.
    const stored = await getOrderForUser(order.number, user.id);
    if (!stored) throw new Error(`Order ${order.number} vanished`);

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: stored.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: order.currency,
            unit_amount: item.unitPriceCents,
            product_data: {
              name: item.productName,
              images: imageFor.has(item.productId)
                ? [imageFor.get(item.productId)!]
                : undefined,
            },
          },
        })),
        customer_email: user.email,
        client_reference_id: order.number,
        metadata: { order_id: String(order.id), order_number: order.number },
        payment_intent_data: {
          metadata: { order_id: String(order.id), order_number: order.number },
        },
        expires_at: Math.floor(order.expiresAt.getTime() / 1000),
        shipping_address_collection: { allowed_countries: ["US"] },
        success_url: `${origin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
        integration_identifier: CHECKOUT_INTEGRATION_ID,
      },
      { idempotencyKey: `checkout-${order.number}` },
    );
    if (!session.url) throw new Error("Checkout Session has no URL");
    await attachCheckoutSession(order.id, session.id);
    url = session.url;
  } catch (error) {
    console.error("Could not start Stripe Checkout", error);
    await releaseOrder(order.id, "canceled");
    updateTag("products");
    return fail("We couldn't start checkout. Please try again in a moment.");
  }

  updateTag("products");
  redirect(url);
}
