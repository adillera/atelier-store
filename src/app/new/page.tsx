import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/products";

export const metadata: Metadata = {
  title: "New Arrivals",
  description:
    "The latest ready-to-wear, bags, shoes and accessories, newest pieces first.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(24);

  return (
    <main className="flex-1">
      <header className="container-page stack items-center gap-4 pt-8 pb-10 text-center lg:pt-12 lg:pb-14">
        <nav aria-label="Breadcrumb">
          <ol className="text-eyebrow flex gap-2">
            <li>
              <Link href="/" className="link-reveal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">New Arrivals</li>
          </ol>
        </nav>
        <h1 className="heading-display">New Arrivals</h1>
        <p className="max-w-md text-ink-muted">
          The latest pieces from our workshops, added in small runs as they
          are finished.
        </p>
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
          <Link href="/" className="btn btn-secondary">
            Return Home
          </Link>
        </section>
      )}
    </main>
  );
}
