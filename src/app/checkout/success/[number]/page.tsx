import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSkeleton } from "@/components/section";
import { OrderView } from "@/components/order-view";
import { PageIntro } from "@/components/page-intro";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

// Where Stripe's success_url ends up (via /checkout/complete). Shows the
// order as our database has it; the webhook is what confirms payment.
export default function OrderConfirmationPage({
  params,
}: PageProps<"/checkout/success/[number]">) {
  return (
    <main className="flex-1">
      <PageIntro title="Your Order" />
      <div className="container-content max-w-3xl pb-(--section-space)">
        <Suspense fallback={<AccountSkeleton rows={4} />}>
          <OrderConfirmation params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function OrderConfirmation({
  params,
}: Pick<PageProps<"/checkout/success/[number]">, "params">) {
  const { number } = await params;
  const user = await requireUser(`/checkout/success/${number}`);
  return <OrderView number={number} user={user} context="checkout" />;
}
