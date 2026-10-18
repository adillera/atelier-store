// Stripe's success_url lands here. This does NOT confirm payment: the order
// is marked paid only by the webhook (fulfillCheckout). Here we only check
// the order is the visitor's, and, if Stripe reports the session complete,
// take the purchased pieces out of the bag before showing the order page.

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { readCartItems, writeCartItems } from "@/lib/cart";
import { removeItems } from "@/lib/cart-items";
import { getOrderBySessionForUser } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) redirect("/bag");

  const auth = await getSession();
  if (!auth) {
    const back = `/checkout/complete?session_id=${encodeURIComponent(sessionId)}`;
    redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  }

  const order = await getOrderBySessionForUser(sessionId, auth.user.id);
  if (!order) redirect("/bag");

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.status === "complete") {
    const items = await readCartItems();
    await writeCartItems(removeItems(items, order.items.map((item) => item.productId)));
  }

  redirect(`/checkout/success/${order.number}`);
}
