// Stripe's cancel_url lands here. The customer's own open order is closed
// right away (session expired, stock returned) instead of waiting 30 minutes.
// If Stripe reports the session already paid, show the order instead.

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { closeOpenOrder, getOrderBySessionForUser } from "@/lib/orders";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const auth = await getSession();
  if (!sessionId || !auth) redirect("/bag");

  const order = await getOrderBySessionForUser(sessionId, auth.user.id);
  if (!order) redirect("/bag");

  if (order.status === "pending") {
    const result = await closeOpenOrder(order);
    if (result === "canceled") revalidateTag("products", "max");
    // Paid before the cancel arrived: show the order (the webhook confirms it).
    if (result === "completed") redirect(`/checkout/success/${order.number}`);
  }
  if (order.status === "paid") redirect(`/checkout/success/${order.number}`);
  // Already closed by the webhook before the customer came back.
  if (order.status === "expired" || order.status === "failed") {
    redirect(`/bag?checkout=${order.status}`);
  }

  redirect("/bag?checkout=canceled");
}
