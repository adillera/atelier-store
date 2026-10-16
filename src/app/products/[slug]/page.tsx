import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductCard } from "@/components/product-card";
import { StockStatus } from "@/components/stock-status";
import { formatPrice, getStockStatus } from "@/lib/catalog";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/products";

export async function generateStaticParams() {
  return getProductSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}

// The slug is read inside Suspense so the route's shared App Shell stays
// URL-independent and product links can prefetch it. Trade-off: a slug that
// isn't prerendered and doesn't exist gets notFound() mid-stream, which
// responds 200 with a noindex tag rather than a real 404.
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </main>
  );
}

const productGrid =
  "container-page grid px-0 md:grid-cols-2 md:gap-8 md:px-(--gutter) md:pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pt-8";

function ProductSkeleton() {
  return (
    <div aria-hidden="true" className={productGrid}>
      <div className="media-product" />
      <div className="stack gap-4 px-gutter py-8 md:px-0 md:py-0">
        <div className="h-3 w-24 bg-surface" />
        <div className="h-7 w-3/4 bg-surface" />
        <div className="h-5 w-20 bg-surface" />
        <div className="mt-4 h-12 bg-surface" />
      </div>
    </div>
  );
}

async function ProductDetails({
  params,
}: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const soldOut = getStockStatus(product.stock) === "sold-out";
  const related = await getRelatedProducts(product.id, product.category.id);

  const sections = [
    { title: "Product Details", items: product.details },
    {
      title: "Shipping & Returns",
      items: [
        "Complimentary express shipping in 2–4 business days",
        "Free returns within 30 days of delivery",
        "Delivered in signature packaging",
      ],
    },
  ];

  return (
    <>
      <article className={productGrid}>
        <div className="media-product">
          <Image
            src={product.image}
            alt={product.alt}
            fill
            preload
            sizes="(min-width: 64rem) 58vw, (min-width: 48rem) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="px-gutter py-8 md:px-0 md:py-0">
          <div className="stack gap-6 md:sticky md:top-[calc(var(--header-height)+2rem)]">
            <nav aria-label="Breadcrumb">
              <ol className="text-eyebrow flex gap-2">
                <li>
                  <Link href="/" className="link-reveal">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{product.category.name}</li>
              </ol>
            </nav>

            <div className="stack gap-3">
              {product.badge ? (
                <p className="text-label">{product.badge}</p>
              ) : null}
              <h1 className="text-xl lg:text-2xl">{product.name}</h1>
              <p className="text-lg">{formatPrice(product.priceCents)}</p>
            </div>

            <StockStatus stock={product.stock} />

            {soldOut ? (
              <button type="button" className="btn btn-primary btn-block" disabled>
                Sold Out
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-block">
                Add to Bag
              </button>
            )}

            <p className="text-ink-muted">{product.description}</p>

            <div className="hairline-t">
              {sections.map((section) => (
                <details key={section.title} className="group hairline-b">
                  <summary className="text-label flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
                    {section.title}
                    <span
                      aria-hidden="true"
                      className="text-base leading-none font-light transition-transform duration-(--duration-fast) group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <ul className="stack gap-2 pb-6 text-sm text-ink-muted">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        </div>
      </article>

      <section className="section">
        <div className="container-page mb-8 lg:mb-10">
          <h2 className="heading-section">You May Also Like</h2>
        </div>
        {/* 4 items fill 2- and 4-column rows; drop the last in the 3-column range. */}
        <div className="container-page grid-products px-0 lg:px-(--gutter) md:max-xl:[&>:nth-child(n+4)]:hidden">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </>
  );
}
