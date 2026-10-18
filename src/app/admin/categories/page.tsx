import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton, ComingNext } from "../admin-page";

export const metadata: Metadata = {
  title: "Categories",
};

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCategories />
    </Suspense>
  );
}

async function AdminCategories() {
  // Every admin page checks the role itself (the layout doesn't guard).
  await requireAdmin("/admin/categories");

  return (
    <>
      <AdminPageHeader title="Categories" description="The categories products are grouped into." />
      <ComingNext>Category list with product counts, create, rename and remove.</ComingNext>
    </>
  );
}
