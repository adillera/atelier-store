import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton, ComingNext } from "../admin-page";

export const metadata: Metadata = {
  title: "Orders",
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOrders />
    </Suspense>
  );
}

async function AdminOrders() {
  // Every admin page checks the role itself (the layout doesn't guard).
  await requireAdmin("/admin/orders");

  return (
    <>
      <AdminPageHeader title="Orders" description="Orders from every customer." />
      <ComingNext>All orders with status, customer and totals, and an order detail view.</ComingNext>
    </>
  );
}
