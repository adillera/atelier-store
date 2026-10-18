import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { StockStatus } from "@/components/stock-status";
import { listCategories, listProductsForAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton } from "../admin-page";

export const metadata: Metadata = {
  title: "Products",
};

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProducts searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProducts({
  searchParams,
}: Pick<PageProps<"/admin/products">, "searchParams">) {
  // Every admin page checks the role itself (the layout doesn't guard),
  // before reading anything else.
  await requireAdmin("/admin/products");
  const { category } = await searchParams;
  const categories = await listCategories();
  const selected = categories.find((item) => String(item.id) === category);
  const products = await listProductsForAdmin({ categoryId: selected?.id });

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${products.length} ${products.length === 1 ? "product" : "products"}${
          selected ? ` in ${selected.name}` : ""
        }.`}
        action={
          <Link href="/admin/products/new" className="btn btn-primary">
            New Product
          </Link>
        }
      />

      <nav aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
        {[{ id: undefined, name: "All" }, ...categories].map((item) => {
          const active = item.id === selected?.id;
          return (
            <Link
              key={item.name}
              href={item.id ? `/admin/products?category=${item.id}` : "/admin/products"}
              aria-current={active ? "page" : undefined}
              className={`text-eyebrow border px-3 py-2 transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {products.length === 0 ? (
        <div className="hairline stack items-start gap-4 p-6 text-sm text-ink-muted">
          <p>No products here yet.</p>
          <Link href="/admin/products/new" className="btn btn-secondary btn-sm">
            Add a Product
          </Link>
        </div>
      ) : (
        <ul aria-label="Products" className="hairline-t">
          <li
            aria-hidden="true"
            className="text-eyebrow hairline-b hidden grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1fr)_6rem_9rem_5rem] gap-4 py-3 md:grid"
          >
            <span />
            <span>Product</span>
            <span>Category</span>
            <span className="text-right">Price</span>
            <span>Availability</span>
            <span />
          </li>
          {products.map((product) => (
            <li
              key={product.id}
              className="hairline-b grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 md:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1fr)_6rem_9rem_5rem]"
            >
              <span className="media-product row-span-3 block md:row-span-1" aria-hidden="true">
                <Image src={product.imageUrl} alt="" fill sizes="3.5rem" className="object-cover" />
              </span>
              <span className="stack min-w-0 gap-1">
                <Link
                  href={`/admin/products/${product.slug}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <span className="truncate text-xs text-ink-muted">
                  /{product.slug}
                  {product.badge ? ` · ${product.badge}` : ""}
                </span>
              </span>
              <span className="col-start-2 text-xs text-ink-muted md:col-start-auto md:text-sm md:text-ink">
                {product.category.name}
              </span>
              <span className="col-start-3 row-start-1 text-right text-sm tabular-nums md:col-start-auto md:row-start-auto">
                {formatPrice(product.priceCents)}
              </span>
              <span className="col-start-2 md:col-start-auto">
                <StockStatus stock={product.stockQuantity} />
              </span>
              <Link
                href={`/admin/products/${product.slug}`}
                className="link-cta col-start-3 row-start-2 justify-self-end md:col-start-auto md:row-start-auto"
              >
                Edit<span className="sr-only"> {product.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
