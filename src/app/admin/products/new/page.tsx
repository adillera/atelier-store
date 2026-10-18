import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listCategories } from "@/lib/admin";
import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton } from "../../admin-page";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New Product",
};

export default function NewProductPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  await requireAdmin("/admin/products/new");
  const categories = await listCategories();

  return (
    <>
      <AdminPageHeader
        title="New Product"
        description="It appears in the store, including New Arrivals, as soon as it's created."
        action={
          <Link href="/admin/products" className="link-cta">
            All Products
          </Link>
        }
      />
      <ProductForm
        categories={categories}
        initial={{
          name: "",
          slug: "",
          categoryId: "",
          price: "",
          description: "",
          details: "",
          imageUrl: "",
          imageAlt: "",
          badge: "New",
          stock: "0",
        }}
      />
    </>
  );
}
