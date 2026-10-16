// Server-side catalog reads. Each query is cached for a few minutes and tagged
// "products", so a future admin/checkout mutation can call
// revalidateTag("products") to refresh stock immediately.

import { desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products } from "@/db/catalog";

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: { id: number; slug: string; name: string };
  priceCents: number;
  image: string;
  alt: string;
  badge?: "New" | "Limited";
  stock: number;
  description: string;
  details: string[];
};

type ProductRow = typeof products.$inferSelect & {
  category: typeof categories.$inferSelect;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
    },
    priceCents: row.priceCents,
    image: row.imageUrl,
    alt: row.imageAlt,
    badge: row.badge ?? undefined,
    stock: row.stockQuantity,
    description: row.description,
    details: row.details,
  };
}

const newestFirst = [desc(products.createdAt), desc(products.id)];

export async function getNewArrivals(limit = 8) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: { category: true },
    orderBy: newestFirst,
    limit,
  });
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const row = await db.query.products.findFirst({
    with: { category: true },
    where: eq(products.slug, slug),
  });
  return row ? toProduct(row) : undefined;
}

// Same-category pieces first, then the rest of the catalog.
export async function getRelatedProducts(
  productId: number,
  categoryId: number,
  limit = 4,
) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: { category: true },
    where: ne(products.id, productId),
    orderBy: [sql`${products.categoryId} = ${categoryId} desc`, ...newestFirst],
    limit,
  });
  return rows.map(toProduct);
}

export async function getProductSlugs() {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  return db.select({ slug: products.slug }).from(products);
}
