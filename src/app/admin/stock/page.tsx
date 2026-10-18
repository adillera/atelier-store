import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton, ComingNext } from "../admin-page";

export const metadata: Metadata = {
  title: "Stock",
};

export default function AdminStockPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminStock />
    </Suspense>
  );
}

async function AdminStock() {
  // Every admin page checks the role itself (the layout doesn't guard).
  await requireAdmin("/admin/stock");

  return (
    <>
      <AdminPageHeader title="Stock" description="Current stock for every product." />
      <ComingNext>Live stock levels, units reserved in open checkouts, and quantity updates.</ComingNext>
    </>
  );
}
