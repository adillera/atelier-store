import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/products";

// A row of four new arrivals with a "View All" link. Used where a page has
// nothing else to show (empty search, empty bag).
export async function ProductRecommendations({ title }: { title: string }) {
  const products = await getNewArrivals(4);
  if (products.length === 0) return null;

  return (
    <section className="pb-(--section-space)">
      <div className="container-page mb-8 flex items-end justify-between gap-4 lg:mb-10">
        <h2 className="heading-section">{title}</h2>
        <Link href="/new" className="link-cta">
          View All
        </Link>
      </div>
      {/* 4 items fill 2- and 4-column rows; drop the last one in the 3-column range. */}
      <div className="container-page grid-products px-0 lg:px-(--gutter) md:max-xl:[&>:nth-child(n+4)]:hidden">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
