// Server-side catalog reads. Each query is cached for a few minutes and tagged
// "products", so a future admin/checkout mutation can call
// revalidateTag("products") to refresh stock immediately.

import { desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products } from "@/db/catalog";

export type Category = { id: number; slug: string; name: string };

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: Category;
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

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const row = await db.query.categories.findFirst({
    columns: { id: true, slug: true, name: true },
    where: eq(categories.slug, slug),
  });
  return row;
}

export async function getCategoryProducts(categoryId: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: { category: true },
    where: eq(products.categoryId, categoryId),
    orderBy: newestFirst,
  });
  return rows.map(toProduct);
}

export async function getCategorySlugs() {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  return db.select({ category: categories.slug }).from(categories);
}

// Case-insensitive match on name, description or category name. LIKE
// wildcards in the query are escaped so they match literally.
export async function searchProducts(query: string, limit = 48) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const matchingCategories = db
    .select({ id: categories.id })
    .from(categories)
    .where(ilike(categories.name, pattern));

  const rows = await db.query.products.findMany({
    with: { category: true },
    where: or(
      ilike(products.name, pattern),
      ilike(products.description, pattern),
      inArray(products.categoryId, matchingCategories),
    ),
    // Name matches first, then description and category matches.
    orderBy: [sql`${products.name} ilike ${pattern} desc`, ...newestFirst],
    limit,
  });
  return rows.map(toProduct);
}

// Bag reads and writes need current price and stock, so unlike the queries
// above this one is deliberately NOT cached. Callers (src/lib/cart.ts) await
// connection() first so it only runs at request time.
export async function getProductsForBag(ids: number[]) {
  if (ids.length === 0) return [];

  const rows = await db.query.products.findMany({
    with: { category: true },
    where: inArray(products.id, ids),
  });
  return rows.map(toProduct);
}
