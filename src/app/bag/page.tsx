import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageIntro } from "@/components/page-intro";
import { ProductRecommendations } from "@/components/product-recommendations";
import { formatPrice } from "@/lib/catalog";
import { getBag } from "@/lib/cart";
import { getOpenCheckout } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

import { BagItems } from "./bag-items";
import { CheckoutButton } from "./checkout-button";
import { CheckoutNotice, type OpenCheckoutNotice } from "./checkout-notice";

export const metadata: Metadata = {
  title: "Shopping Bag",
  robots: { index: false },
};

// The bag comes from a cookie, so it's read inside Suspense and the page
// header stays in the static shell.
export default function BagPage({ searchParams }: PageProps<"/bag">) {
  return (
    <main className="flex-1">
      <PageIntro title="Shopping Bag" />
      <Suspense fallback={<BagSkeleton />}>
        <BagContents searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const layout =
  "container-content grid gap-10 pb-(--section-space) lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16";

function BagSkeleton() {
  return (
    <div aria-hidden="true" className={layout}>
      <div className="hairline-t">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="hairline-b grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6"
          >
            <div className="media-product" />
            <div className="stack gap-3">
              <div className="h-3 w-20 bg-surface" />
              <div className="h-4 w-2/3 bg-surface" />
              <div className="h-10 w-28 bg-surface" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 bg-surface" />
    </div>
  );
}

async function BagContents({
  searchParams,
}: Pick<PageProps<"/bag">, "searchParams">) {
  const [auth, { checkout }] = await Promise.all([getSession(), searchParams]);
  const signedIn = Boolean(auth);

  // A checkout the customer left without finishing or cancelling (e.g. the
  // browser's Back button). Its reserved units count as available here.
  const open = auth ? await getOpenCheckout(auth.user.id) : undefined;
  let openNotice: OpenCheckoutNotice | undefined;
  let reserved: ReadonlyMap<number, number> | undefined;
  if (open) {
    const session = await getStripe()
      .checkout.sessions.retrieve(open.sessionId)
      .catch(() => null);
    if (session?.status === "open" && session.url) {
      reserved = open.reserved;
      openNotice = {
        state: "open",
        url: session.url,
        cancelUrl: `/checkout/cancel?session_id=${encodeURIComponent(open.sessionId)}`,
        minutesLeft: open.minutesLeft,
      };
    } else if (session?.status === "complete") {
      // Paid; the webhook hasn't confirmed it yet.
      openNotice = { state: "confirming", orderNumber: open.number };
    }
  }

  const bag = await getBag(reserved);
  const notice = (
    <CheckoutNotice
      open={openNotice}
      returned={typeof checkout === "string" ? checkout : undefined}
    />
  );

  if (bag.lines.length === 0) {
    return (
      <>
        {notice}
        <section className="container-prose stack items-center gap-4 pb-(--section-space) text-center">
          <h2 className="heading-display-sm">Your bag is empty</h2>
          <p className="text-ink-muted">
            Discover the latest pieces, or search for something specific.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/new" className="btn btn-primary">
              Shop New Arrivals
            </Link>
            <Link href="/search" className="btn btn-secondary">
              Search
            </Link>
          </div>
        </section>
        <ProductRecommendations title="You May Also Like" />
      </>
    );
  }

  const itemLabel = `${bag.itemCount} ${bag.itemCount === 1 ? "item" : "items"}`;
  const soldOut = bag.lines.filter((line) => !line.available).length;

  return (
    <>
      {notice}
      <div className={layout}>
        <BagItems lines={bag.lines} itemLabel={itemLabel} />

        <aside aria-label="Order summary" className="lg:pt-13">
          <div className="stack gap-6 bg-surface p-6 lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
            <h2 className="heading-section">Summary</h2>
            <dl className="stack gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Subtotal ({itemLabel})</dt>
                <dd className="tabular-nums" data-testid="subtotal">
                  {formatPrice(bag.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-ink-muted">
                <dt>Shipping</dt>
                <dd>Complimentary</dd>
              </div>
              <div className="hairline-t flex justify-between gap-4 pt-3 text-base">
                <dt>Total</dt>
                <dd className="tabular-nums" data-testid="total">
                  {formatPrice(bag.subtotalCents)}
                </dd>
              </div>
            </dl>
            {soldOut > 0 ? (
              <p className="border border-danger px-4 py-3 text-xs text-danger">
                {soldOut === 1
                  ? "1 sold-out piece isn't included in your subtotal."
                  : `${soldOut} sold-out pieces aren't included in your subtotal.`}
              </p>
            ) : null}
            <CheckoutButton disabled={soldOut > 0} signedIn={signedIn} />
            <p className="text-xs text-ink-muted">
              {signedIn
                ? "You'll pay securely on Stripe. "
                : "You'll sign in, then pay securely on Stripe. "}
              Your pieces are reserved for 30 minutes once checkout starts.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
