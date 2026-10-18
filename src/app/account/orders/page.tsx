import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountSection, AccountSkeleton } from "@/components/section";
import { countUnfinishedOrders, getOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

import { OrderList } from "./order-list";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  return (
    <Suspense fallback={<AccountSkeleton rows={3} />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/account/orders">, "searchParams">) {
  const [user, { show }] = await Promise.all([
    requireUser("/account/orders"),
    searchParams,
  ]);
  const showAll = show === "all";
  // Both queries are scoped to the signed-in customer's id.
  const [orders, unfinished] = await Promise.all([
    getOrdersForUser(user.id, { includeUnfinished: showAll }),
    countUnfinishedOrders(user.id),
  ]);

  return (
    <div className="stack gap-12">
      <div className="stack gap-2">
        <p className="text-eyebrow">Orders</p>
        <p className="heading-display-sm">Order History</p>
      </div>

      <AccountSection
        title={showAll ? "All Orders" : "Your Orders"}
        action={
          unfinished > 0 ? (
            <Link
              href={showAll ? "/account/orders" : "/account/orders?show=all"}
              className="link-cta shrink-0"
            >
              {showAll ? "Hide unfinished" : `Show unfinished (${unfinished})`}
            </Link>
          ) : undefined
        }
      >
        {orders.length > 0 ? (
          <OrderList orders={orders} />
        ) : (
          <div className="hairline-t stack items-start gap-4 py-8">
            <p className="text-sm text-ink-muted">
              {showAll || unfinished === 0
                ? "You haven't placed any orders yet."
                : "You have no completed orders yet."}
            </p>
            <Link href="/new" className="btn btn-primary">
              Shop New Arrivals
            </Link>
          </div>
        )}
        {showAll ? (
          <p className="text-xs text-ink-muted">
            Unfinished checkouts were cancelled or expired before payment.
            Nothing was charged for them.
          </p>
        ) : null}
      </AccountSection>
    </div>
  );
}
