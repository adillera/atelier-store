// The bag cookie's contents: product ids and quantities, nothing else.
// Prices, names and stock always come from the database (see src/lib/cart.ts),
// so a tampered cookie can only change the quantities in its own bag, and
// those are clamped to live stock on every read and write.
//
// Pure functions, no server-only import, so they can be exercised directly.

export type CartItem = { productId: number; quantity: number };

export const BAG_COOKIE = "atelier_bag";
export const MAX_BAG_LINES = 20;
// Sanity cap for parsed values; real limits come from stock.
const MAX_STORED_QUANTITY = 999;

const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

// Malformed input yields an empty bag, never an error. Invalid entries are
// skipped, duplicate ids merged, and only the first MAX_BAG_LINES kept.
export function parseCartCookie(raw: string | undefined): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const items: CartItem[] = [];
  for (const entry of data) {
    if (!Array.isArray(entry)) continue;
    const [productId, quantity] = entry;
    if (!isPositiveInt(productId) || !isPositiveInt(quantity)) continue;

    const existing = items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_STORED_QUANTITY);
    } else if (items.length < MAX_BAG_LINES) {
      items.push({ productId, quantity: Math.min(quantity, MAX_STORED_QUANTITY) });
    }
  }
  return items;
}

export function serializeCart(items: CartItem[]) {
  return JSON.stringify(items.map((item) => [item.productId, item.quantity]));
}

// Returns a new list: 0 removes the line, a new id is appended at the end,
// an existing one keeps its position.
export function setItemQuantity(
  items: CartItem[],
  productId: number,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return items.filter((item) => item.productId !== productId);
  if (items.some((item) => item.productId === productId)) {
    return items.map((item) =>
      item.productId === productId ? { productId, quantity } : item,
    );
  }
  return [...items, { productId, quantity }];
}

// Drops the given products (e.g. after they were purchased).
export function removeItems(items: CartItem[], productIds: number[]): CartItem[] {
  return items.filter((item) => !productIds.includes(item.productId));
}
