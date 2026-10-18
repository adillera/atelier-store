import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderView } from "@/components/order-view";
import { AccountSkeleton } from "@/components/section";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order Details",
};

export default function OrderDetailsPage({
  params,
}: PageProps<"/account/orders/[number]">) {
  return (
    <Suspense fallback={<AccountSkeleton rows={4} />}>
      <OrderDetails params={params} />
    </Suspense>
  );
}

async function OrderDetails({
  params,
}: Pick<PageProps<"/account/orders/[number]">, "params">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  // OrderView looks the order up by number AND this user's id: 404 otherwise.
  return <OrderView number={number} user={user} context="account" />;
}
