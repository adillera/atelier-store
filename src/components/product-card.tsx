import Image from "next/image";
import Link from "next/link";

import { formatPrice, getStockStatus } from "@/lib/catalog";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const badge =
    getStockStatus(product.stock) === "sold-out" ? "Sold Out" : product.badge;

  return (
    <Link href={`/products/${product.slug}`} className="group stack gap-3">
      <div className="media-product">
        <Image
          src={product.image}
          alt={product.alt}
          fill
          sizes="(min-width: 80rem) 25vw, (min-width: 48rem) 33vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
        {badge ? (
          <span className="text-eyebrow absolute top-3 left-3 bg-paper px-2 py-1 text-ink">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="stack gap-1 px-3 lg:px-0">
        <p className="text-eyebrow">{product.category.name}</p>
        <h3 className="text-sm">{product.name}</h3>
        <p className="text-sm text-ink-muted">{formatPrice(product.priceCents)}</p>
      </div>
    </Link>
  );
}
