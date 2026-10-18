import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductCard } from "@/components/product-card";
import {
  getCategoryBySlug,
  getCategoryProducts,
  getCategorySlugs,
} from "@/lib/products";

export async function generateStaticParams() {
  return getCategorySlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} from Atelier, newest pieces first.`,
  };
}

// The slug is read inside Suspense so the route's shared App Shell stays
// URL-independent and category links can prefetch it (see the product page).
export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<CategorySkeleton />}>
        <CategoryCollection params={params} />
      </Suspense>
    </main>
  );
}

function CategorySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="container-page stack items-center gap-4 pt-8 pb-10 lg:pt-12 lg:pb-14">
        <div className="h-3 w-32 bg-surface" />
        <div className="h-10 w-56 bg-surface" />
      </div>
      <div className="container-page grid-products px-0 pb-(--section-space) lg:px-(--gutter)">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="media-product" />
        ))}
      </div>
    </div>
  );
}

async function CategoryCollection({
  params,
}: Pick<PageProps<"/[category]">, "params">) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getCategoryProducts(category.id);

  return (
    <>
      <header className="container-page stack items-center gap-4 pt-8 pb-10 text-center lg:pt-12 lg:pb-14">
        <nav aria-label="Breadcrumb">
          <ol className="text-eyebrow flex gap-2">
            <li>
              <Link href="/" className="link-reveal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>
        <h1 className="heading-display">{category.name}</h1>
      </header>

      {products.length > 0 ? (
        <section aria-label="Products" className="pb-(--section-space)">
          <div className="container-page mb-6">
            <div className="hairline-t flex items-center justify-between py-4">
              <p className="text-eyebrow">
                {products.length} {products.length === 1 ? "Piece" : "Pieces"}
              </p>
              <p className="text-eyebrow">Newest First</p>
            </div>
          </div>
          <div className="container-page grid-products px-0 lg:px-(--gutter)">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <section className="container-prose section stack items-center gap-6 text-center">
          <p className="text-ink-muted">
            New pieces are on their way. Please check back soon.
          </p>
          <Link href="/new" className="btn btn-secondary">
            Shop New Arrivals
          </Link>
        </section>
      )}
    </>
  );
}
