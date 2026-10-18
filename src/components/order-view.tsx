import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountSection, DetailList } from "@/components/section";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { RefreshWhilePending } from "@/components/refresh-while-pending";
import { formatPrice } from "@/lib/catalog";
import { formatOrderDate as formatDate } from "@/lib/order-status";
import { getOrderForUser, minutesUntil } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

type View =
  | { kind: "paid" }
  | { kind: "confirming" } // paid on Stripe, webhook not processed yet
  | { kind: "processing" } // delayed payment method still settling
  | { kind: "unpaid"; url: string; cancelUrl: string; minutesLeft: number }
  | { kind: "closed"; reason: "failed" | "expired" | "canceled" }
  // Expired on Stripe, but the webhook hasn't released the stock yet.
  | { kind: "expiring" };

const copy = {
  paid: {
    eyebrow: "Confirmed",
    title: "Thank you for your order",
    body: "Your payment was received. We'll prepare your pieces for delivery.",
  },
  confirming: {
    eyebrow: "Confirming payment",
    title: "Confirming your payment",
    body: "Stripe has your payment and we're confirming it. This usually takes a few seconds. You can leave this page; your order is saved.",
  },
  processing: {
    eyebrow: "Payment processing",
    title: "Your payment is processing",
    body: "Your payment method takes a little longer to confirm. Your pieces are reserved in the meantime.",
  },
  unpaid: {
    eyebrow: "Awaiting payment",
    title: "Your payment isn't complete",
    body: "Nothing has been charged yet.",
  },
  failed: {
    eyebrow: "Not completed",
    title: "Your payment didn't go through",
    body: "Nothing was charged and the pieces were returned to stock.",
  },
  expired: {
    eyebrow: "Not completed",
    title: "This checkout expired",
    body: "Nothing was charged and the pieces were returned to stock.",
  },
  canceled: {
    eyebrow: "Not completed",
    title: "This checkout was cancelled",
    body: "Nothing was charged and the pieces were returned to stock.",
  },
  expiring: {
    eyebrow: "Not completed",
    title: "This checkout expired",
    body: "Nothing was charged. The pieces will be returned to stock shortly.",
  },
} as const;


// One order, as the signed-in owner sees it. Used after checkout
// ("checkout") and in the account's order history ("account").
// Reads only: payment is confirmed solely by the Stripe webhook.
export async function OrderView({
  number,
  user,
  context,
}: {
  number: string;
  user: { id: string; email: string };
  context: "checkout" | "account";
}) {
  // Scoped to the owner: anyone else gets a 404.
  const order = await getOrderForUser(number, user.id);
  if (!order) notFound();

  // `pending` alone can't tell "paid, awaiting the webhook" from "never
  // paid", so look at the Stripe session. This read only picks the message;
  // the order itself changes only through the webhook.
  let view: View;
  if (order.status === "paid") view = { kind: "paid" };
  else if (order.status === "processing") view = { kind: "processing" };
  else if (order.status !== "pending") view = { kind: "closed", reason: order.status };
  else {
    const session = order.stripeCheckoutSessionId
      ? await getStripe()
          .checkout.sessions.retrieve(order.stripeCheckoutSessionId)
          .catch(() => null)
      : null;
    if (session?.status === "open" && session.url) {
      view = {
        kind: "unpaid",
        url: session.url,
        cancelUrl: `/checkout/cancel?session_id=${encodeURIComponent(session.id)}`,
        minutesLeft: minutesUntil(order.expiresAt),
      };
    } else if (session?.status === "expired") {
      view = { kind: "expiring" };
    } else {
      view = { kind: "confirming" };
    }
  }

  const base = view.kind === "closed" ? copy[view.reason] : copy[view.kind];
  // In order history a paid order is a record, not a thank-you moment.
  const text =
    context === "account" && view.kind === "paid"
      ? {
          eyebrow: base.eyebrow,
          title: `Order ${order.number}`,
          body: order.paidAt ? `Paid on ${formatDate(order.paidAt)}.` : base.body,
        }
      : base;
  const address = order.shipping?.address;
  // Keep the Status row consistent with the headline for `pending` orders.
  const statusLabel =
    view.kind === "confirming"
      ? "Confirming payment"
      : view.kind === "unpaid"
        ? "Awaiting payment"
        : view.kind === "expiring"
          ? "Expired"
          : undefined;

  return (
    <div className="stack gap-12">
      <div role="status" className="stack items-center gap-3 text-center">
        <p className="text-eyebrow">
          {text.eyebrow} · {order.number}
        </p>
        <p className="heading-display-sm">{text.title}</p>
        <p className="max-w-md text-ink-muted">
          {text.body}
          {view.kind === "unpaid"
            ? ` Your pieces are reserved for about ${view.minutesLeft} ${
                view.minutesLeft === 1 ? "minute" : "minutes"
              }.`
            : null}
        </p>
        {view.kind === "confirming" ? <RefreshWhilePending /> : null}
        {view.kind === "unpaid" ? (
          <div className="mt-3 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            {/* Plain links: one leaves the site, one changes state. */}
            <a href={view.url} className="btn btn-primary">
              Return to Payment
            </a>
            <a href={view.cancelUrl} className="btn btn-secondary">
              Cancel Checkout
            </a>
          </div>
        ) : null}
        {view.kind === "closed" || view.kind === "expiring" ? (
          <Link href="/bag" className="btn btn-secondary mt-3">
            Return to Bag
          </Link>
        ) : null}
      </div>

      <AccountSection title="Items">
        <ul className="hairline-t">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="hairline-b grid grid-cols-[4rem_minmax(0,1fr)_auto] items-start gap-4 py-4 text-sm"
            >
              <Link
                href={`/products/${item.product.slug}`}
                className="media-product block"
                tabIndex={-1}
                aria-hidden="true"
              >
                <Image
                  src={item.product.imageUrl}
                  alt=""
                  fill
                  sizes="4rem"
                  className="object-cover"
                />
              </Link>
              <span className="stack gap-1">
                <Link href={`/products/${item.product.slug}`} className="hover:underline">
                  {item.productName}
                </Link>
                <span className="text-ink-muted">
                  Qty {item.quantity} · {formatPrice(item.unitPriceCents)} each
                </span>
              </span>
              <span className="tabular-nums">
                {formatPrice(item.unitPriceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="stack gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-ink-muted">
            <dt>Shipping</dt>
            <dd>Complimentary</dd>
          </div>
          <div className="hairline-t flex justify-between gap-4 pt-3 text-base">
            <dt>{view.kind === "paid" ? "Total paid" : "Total"}</dt>
            <dd className="tabular-nums" data-testid="order-total">
              {formatPrice(order.totalCents)}
            </dd>
          </div>
        </dl>
      </AccountSection>

      <AccountSection title="Order Details">
        <DetailList
          items={[
            { label: "Order Number", value: order.number },
            {
              label: "Status",
              value: <OrderStatusBadge status={order.status} label={statusLabel} />,
            },
            { label: "Placed", value: formatDate(order.createdAt) },
            ...(view.kind === "paid" && order.paidAt
              ? [{ label: "Paid", value: formatDate(order.paidAt) }]
              : []),
            ...(view.kind === "paid"
              ? [
                  { label: "Email", value: order.email ?? user.email },
                  {
                    label: "Ship To",
                    value: address ? (
                      <span className="stack">
                        {order.shipping?.name ? <span>{order.shipping.name}</span> : null}
                        <span>{address.line1}</span>
                        {address.line2 ? <span>{address.line2}</span> : null}
                        <span>
                          {[address.city, address.state, address.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                ]
              : []),
          ]}
        />
      </AccountSection>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {context === "account" ? (
          <Link href="/account/orders" className="btn btn-secondary">
            Back to Orders
          </Link>
        ) : (
          <>
            <Link href="/new" className="btn btn-primary">
              Continue Shopping
            </Link>
            <Link href="/account/orders" className="btn btn-secondary">
              View Orders
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
