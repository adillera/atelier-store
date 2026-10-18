// Admin data access. Uncached on purpose: admins must see live values
// (stock especially). Nothing here checks authorization; the admin pages
// (requireAdmin) and actions (requireAdminAction) do that before calling in.

import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/catalog";
import type { ProductInput } from "@/lib/admin-validation";
import { violatedConstraint } from "@/lib/db-errors";

export async function listCategories() {
  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
}

export async function listProductsForAdmin({ categoryId }: { categoryId?: number } = {}) {
  return db.query.products.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      priceCents: true,
      stockQuantity: true,
      badge: true,
      imageUrl: true,
      updatedAt: true,
    },
    where: categoryId ? eq(products.categoryId, categoryId) : undefined,
    with: { category: { columns: { id: true, name: true } } },
    orderBy: [asc(products.name), asc(products.id)],
  });
}

export async function getProductForAdmin(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: { columns: { id: true, name: true, slug: true } } },
  });
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getProductForAdmin>>>;

const SLUG_UNIQUE = "products_slug_unique";

export async function insertProduct(input: ProductInput) {
  try {
    const [row] = await db
      .insert(products)
      .values({
        name: input.name,
        slug: input.slug,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        description: input.description,
        details: input.details,
        imageUrl: input.imageUrl,
        imageAlt: input.imageAlt,
        badge: input.badge,
        stockQuantity: input.stockQuantity,
      })
      .returning({ slug: products.slug });
    return { ok: true as const, slug: row.slug };
  } catch (error) {
    if (violatedConstraint(error) === SLUG_UNIQUE) {
      return { ok: false as const, reason: "slug-taken" as const };
    }
    throw error;
  }
}

export type UpdateResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "slug-taken" | "not-found" }
  | { ok: false; reason: "stock-changed"; currentStock: number };

// Stock is only written when the admin changed it, and only if it still has
// the value the admin saw (`expectedStock`). Checkouts reserve and release
// stock concurrently, so a blind overwrite could undo a reservation.
export async function updateProduct(
  id: number,
  input: ProductInput,
  expectedStock: number,
): Promise<UpdateResult> {
  const stockChanged = input.stockQuantity !== expectedStock;
  try {
    const rows = await db
      .update(products)
      .set({
        name: input.name,
        slug: input.slug,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        description: input.description,
        details: input.details,
        imageUrl: input.imageUrl,
        imageAlt: input.imageAlt,
        badge: input.badge,
        ...(stockChanged ? { stockQuantity: input.stockQuantity } : {}),
      })
      .where(
        stockChanged
          ? and(eq(products.id, id), eq(products.stockQuantity, expectedStock))
          : eq(products.id, id),
      )
      .returning({ slug: products.slug });
    if (rows.length > 0) return { ok: true, slug: rows[0].slug };
  } catch (error) {
    if (violatedConstraint(error) === SLUG_UNIQUE) return { ok: false, reason: "slug-taken" };
    throw error;
  }

  // Nothing updated: either the product is gone or its stock moved.
  const [current] = await db
    .select({ stock: products.stockQuantity })
    .from(products)
    .where(eq(products.id, id));
  if (!current) return { ok: false, reason: "not-found" };
  return { ok: false, reason: "stock-changed", currentStock: current.stock };
}

// Units held by open checkouts (pending/processing orders), per product.
export async function reservedUnits(productId: number) {
  const result = await db.execute<{ reserved: number }>(sql`
    SELECT coalesce(sum(oi.quantity), 0)::int AS reserved
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = ${productId} AND o.status IN ('pending', 'processing')`);
  return result.rows[0]?.reserved ?? 0;
}
