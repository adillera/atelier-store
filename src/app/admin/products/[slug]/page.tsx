import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getProductForAdmin, listCategories, reservedUnits } from "@/lib/admin";
import { centsToPriceInput } from "@/lib/admin-validation";
import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton } from "../../admin-page";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit Product",
};

export default function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[slug]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <EditProduct params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const SAVED: Record<string, string> = {
  created: "Product created. It's now live in the store.",
  updated: "Changes saved. The URL changed with the slug.",
};

async function EditProduct({
  params,
  searchParams,
}: Pick<PageProps<"/admin/products/[slug]">, "params" | "searchParams">) {
  const [{ slug }, { saved }] = await Promise.all([params, searchParams]);
  await requireAdmin(`/admin/products/${slug}`);

  const product = await getProductForAdmin(slug);
  if (!product) notFound();
  const [categories, reserved] = await Promise.all([
    listCategories(),
    reservedUnits(product.id),
  ]);
  const savedMessage = typeof saved === "string" ? SAVED[saved] : undefined;

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`${product.category.name} · /products/${product.slug}`}
        action={
          <div className="flex flex-wrap gap-4">
            <Link href={`/products/${product.slug}`} className="link-cta" target="_blank">
              View in Store
            </Link>
            <Link href="/admin/products" className="link-cta">
              All Products
            </Link>
          </div>
        }
      />
      {savedMessage ? (
        <p role="status" className="mb-8 border border-success px-4 py-3 text-sm text-success">
          {savedMessage}
        </p>
      ) : null}
      <ProductForm
        // Re-mount after a slug change so the form starts from the saved row.
        key={product.slug}
        categories={categories}
        product={{
          id: product.id,
          slug: product.slug,
          stock: product.stockQuantity,
          reserved,
        }}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: String(product.categoryId),
          price: centsToPriceInput(product.priceCents),
          description: product.description,
          details: product.details.join("\n"),
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt,
          badge: product.badge ?? "",
          stock: String(product.stockQuantity),
        }}
      />
    </>
  );
}
