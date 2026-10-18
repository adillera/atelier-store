"use server";

// Bag mutations. The client only ever sends a product id and a quantity;
// prices are never accepted from it. Each action re-reads the product's
// current stock before writing, so quantities can't exceed what's available.
// Guests can use the bag; no session is required.

import { MAX_BAG_LINES, setItemQuantity, type CartItem } from "@/lib/cart-items";
import { readCartItems, writeCartItems } from "@/lib/cart";
import { getProductsForBag, type Product } from "@/lib/products";

export type BagActionState = {
  status?: "success" | "error";
  message?: string;
  // Changes on every response so repeated messages are re-announced.
  key?: number;
};

const UNAVAILABLE = "This piece is no longer available.";
const SOLD_OUT = "This piece is sold out.";

function parsePositiveInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

const reply = (status: "success" | "error", message: string): BagActionState => ({
  status,
  message,
  key: Date.now(),
});

// Loads the bag with fresh product data (one query, at most 21 ids) and
// cleans it before any write: lines for deleted products are dropped and
// quantities clamped to current stock. Sold-out lines stay so the bag can
// show them until the customer removes them.
async function loadBag(productId: number) {
  const stored = await readCartItems();
  const ids = [...new Set([...stored.map((item) => item.productId), productId])];
  const products = new Map(
    (await getProductsForBag(ids)).map((product) => [product.id, product]),
  );
  const items: CartItem[] = [];
  for (const item of stored) {
    const product = products.get(item.productId);
    if (!product) continue;
    const quantity =
      product.stock > 0 ? Math.min(item.quantity, product.stock) : item.quantity;
    items.push({ productId: item.productId, quantity });
  }
  return { items, product: products.get(productId) as Product | undefined };
}

export async function addToBag(
  _prev: BagActionState,
  formData: FormData,
): Promise<BagActionState> {
  const productId = parsePositiveInt(formData.get("productId"));
  if (!productId) return reply("error", UNAVAILABLE);

  const { items, product } = await loadBag(productId);
  if (!product) return reply("error", UNAVAILABLE);
  if (product.stock <= 0) return reply("error", SOLD_OUT);

  const existing = items.find((item) => item.productId === productId);
  const current = existing?.quantity ?? 0;
  if (current >= product.stock) {
    // Persist the cleaned bag even though nothing was added.
    await writeCartItems(items);
    return reply(
      "error",
      product.stock === 1
        ? "Only 1 available, and it's already in your bag."
        : `Only ${product.stock} available, and all ${product.stock} are already in your bag.`,
    );
  }
  if (!existing && items.length >= MAX_BAG_LINES) {
    return reply("error", `Your bag can hold up to ${MAX_BAG_LINES} different pieces.`);
  }

  await writeCartItems(setItemQuantity(items, productId, current + 1));
  return reply("success", "Added to your bag.");
}

// quantity = 0 removes the line (the bag's Remove button sends 0).
export async function updateBagQuantity(
  _prev: BagActionState,
  formData: FormData,
): Promise<BagActionState> {
  const productId = parsePositiveInt(formData.get("productId"));
  const requested = parsePositiveInt(formData.get("quantity"));
  if (!productId || requested === null) {
    return reply("error", "Please choose a valid quantity.");
  }

  const { items, product } = await loadBag(productId);
  if (requested === 0) {
    await writeCartItems(setItemQuantity(items, productId, 0));
    return reply("success", "Removed from your bag.");
  }
  // Also covers a product deleted since it was added (loadBag dropped it).
  if (!product || !items.some((item) => item.productId === productId)) {
    await writeCartItems(items);
    return reply(
      "error",
      product ? "This piece is no longer in your bag." : UNAVAILABLE,
    );
  }
  if (product.stock <= 0) {
    await writeCartItems(items);
    return reply("error", SOLD_OUT);
  }

  if (requested > product.stock) {
    await writeCartItems(setItemQuantity(items, productId, product.stock));
    return reply("error", `Only ${product.stock} available.`);
  }

  await writeCartItems(setItemQuantity(items, productId, requested));
  return reply("success", "Quantity updated.");
}
