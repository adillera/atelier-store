// Server-side shopping bag. The bag lives in an HTTP-only cookie holding
// product ids and quantities only (src/lib/cart-items.ts); every read joins
// it against current product data, so prices and stock are always live.
// Stock isn't reserved by a bag: it's checked here and in the bag actions,
// and will be decremented at checkout.

import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";

import {
  BAG_COOKIE,
  parseCartCookie,
  serializeCart,
  type CartItem,
} from "@/lib/cart-items";
import { getProductsForBag, type Product } from "@/lib/products";

export type BagLine = {
  product: Product;
  // Already clamped to current stock (0 when sold out).
  quantity: number;
  lineTotalCents: number;
  available: boolean;
  notice?: string;
};

export type Bag = {
  lines: BagLine[];
  subtotalCents: number;
  itemCount: number;
};

export async function readCartItems() {
  const store = await cookies();
  return parseCartCookie(store.get(BAG_COOKIE)?.value);
}

// Only callable from Server Actions and Route Handlers.
export async function writeCartItems(items: CartItem[]) {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(BAG_COOKIE);
    return;
  }
  store.set(BAG_COOKIE, serializeCart(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

// Cookie-only count for the header badge: no database read.
export async function getBagItemCount() {
  const items = await readCartItems();
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// `reserved`: units the customer's own open checkout is holding. They're
// counted as available, otherwise the bag would show the customer's own
// items as sold out while their checkout is open.
export async function getBag(
  reserved: ReadonlyMap<number, number> = new Map(),
): Promise<Bag> {
  // Request-time only: the product read below is uncached (see
  // getSession() in src/lib/session.ts for why this matters).
  await connection();

  const items = await readCartItems();
  const products = await getProductsForBag(items.map((item) => item.productId));
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: BagLine[] = [];
  for (const item of items) {
    // Products that no longer exist drop out silently.
    const found = byId.get(item.productId);
    if (!found) continue;
    const product = {
      ...found,
      stock: found.stock + (reserved.get(found.id) ?? 0),
    };

    if (product.stock <= 0) {
      lines.push({
        product,
        quantity: 0,
        lineTotalCents: 0,
        available: false,
        notice: "This piece is now sold out.",
      });
      continue;
    }

    const quantity = Math.min(item.quantity, product.stock);
    lines.push({
      product,
      quantity,
      lineTotalCents: product.priceCents * quantity,
      available: true,
      notice:
        quantity < item.quantity
          ? `Only ${product.stock} available. We've updated your quantity.`
          : undefined,
    });
  }

  return {
    lines,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
