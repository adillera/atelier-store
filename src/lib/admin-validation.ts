// Product form rules, shared by the admin form (instant feedback) and the
// admin Server Actions (the authority). The database backs these up with a
// unique slug, price/stock CHECKs and the category foreign key.

export const PRODUCT_BADGES = ["New", "Limited"] as const;
export type ProductBadge = (typeof PRODUCT_BADGES)[number];

export type ProductField =
  | "name"
  | "slug"
  | "categoryId"
  | "price"
  | "description"
  | "details"
  | "imageUrl"
  | "imageAlt"
  | "badge"
  | "stock";

export type ProductFieldErrors = Partial<Record<ProductField, string>>;
export type ProductFormValues = Record<ProductField, string>;

export type ProductInput = {
  name: string;
  slug: string;
  categoryId: number;
  priceCents: number;
  description: string;
  details: string[];
  imageUrl: string;
  imageAlt: string;
  badge: ProductBadge | null;
  stockQuantity: number;
};

export const LIMITS = {
  name: 120,
  slug: 80,
  description: 2000,
  detailLines: 12,
  detailLength: 200,
  imageAlt: 200,
  maxPriceCents: 10_000_000, // $100,000
  maxStock: 9_999,
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d{1,6}(?:\.\d{1,2})?$/;
const STOCK_PATTERN = /^\d{1,4}$/;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/, "");
}

// "$1,250.50" → 125050. Returns null if it isn't a plain money amount.
export function parsePriceToCents(raw: string) {
  const cleaned = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!PRICE_PATTERN.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function centsToPriceInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export const parseDetails = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

// Only Unsplash photos: the one host next.config.ts allows for next/image.
// Query strings are dropped so stored URLs stay canonical.
export function normalizeImageUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") return null;
  if (!/^\/photo-[A-Za-z0-9-]+$/.test(url.pathname)) return null;
  return `${url.origin}${url.pathname}`;
}

export function validateProductField(
  field: ProductField,
  raw: string,
  categoryIds?: readonly number[],
): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      if (!value) return "Enter a product name.";
      if (value.length > LIMITS.name) return `Keep the name under ${LIMITS.name} characters.`;
      return;
    case "slug":
      if (!value) return "Enter a URL slug.";
      if (value.length > LIMITS.slug) return `Keep the slug under ${LIMITS.slug} characters.`;
      if (!SLUG_PATTERN.test(value)) {
        return "Use lowercase letters, numbers and single hyphens, e.g. silk-scarf.";
      }
      return;
    case "categoryId": {
      const id = Number(value);
      if (!value || !Number.isSafeInteger(id)) return "Choose a category.";
      if (categoryIds && !categoryIds.includes(id)) return "Choose a category from the list.";
      return;
    }
    case "price": {
      if (!value) return "Enter a price.";
      const cents = parsePriceToCents(value);
      if (cents === null) return "Enter a price like 1250 or 1250.50.";
      if (cents < 1) return "The price must be at least $0.01.";
      if (cents > LIMITS.maxPriceCents) return "The price can't be more than $100,000.";
      return;
    }
    case "description":
      if (!value) return "Enter a description.";
      if (value.length > LIMITS.description) {
        return `Keep the description under ${LIMITS.description} characters.`;
      }
      return;
    case "details": {
      const lines = parseDetails(raw);
      if (lines.length > LIMITS.detailLines) {
        return `Use at most ${LIMITS.detailLines} detail lines.`;
      }
      if (lines.some((line) => line.length > LIMITS.detailLength)) {
        return `Keep each detail under ${LIMITS.detailLength} characters.`;
      }
      return;
    }
    case "imageUrl":
      if (!value) return "Enter an image URL.";
      if (!normalizeImageUrl(value)) {
        return "Use an Unsplash photo URL, e.g. https://images.unsplash.com/photo-…";
      }
      return;
    case "imageAlt":
      if (!value) return "Describe the image for screen readers.";
      if (value.length > LIMITS.imageAlt) {
        return `Keep the description under ${LIMITS.imageAlt} characters.`;
      }
      return;
    case "badge":
      if (value && !(PRODUCT_BADGES as readonly string[]).includes(value)) {
        return "Choose a badge from the list.";
      }
      return;
    case "stock": {
      if (!STOCK_PATTERN.test(value)) return "Enter a whole number of pieces.";
      if (Number(value) > LIMITS.maxStock) return `Stock can't be more than ${LIMITS.maxStock}.`;
      return;
    }
  }
}

export const PRODUCT_FIELDS: ProductField[] = [
  "name",
  "slug",
  "categoryId",
  "price",
  "description",
  "details",
  "imageUrl",
  "imageAlt",
  "badge",
  "stock",
];

// Validates everything; returns errors, or the cleaned input when valid.
export function parseProductForm(
  values: ProductFormValues,
  categoryIds?: readonly number[],
): { errors: ProductFieldErrors } | { input: ProductInput } {
  const errors: ProductFieldErrors = {};
  for (const field of PRODUCT_FIELDS) {
    const message = validateProductField(field, values[field] ?? "", categoryIds);
    if (message) errors[field] = message;
  }
  if (Object.keys(errors).length > 0) return { errors };

  return {
    input: {
      name: values.name.trim(),
      slug: values.slug.trim(),
      categoryId: Number(values.categoryId),
      priceCents: parsePriceToCents(values.price)!,
      description: values.description.trim(),
      details: parseDetails(values.details),
      imageUrl: normalizeImageUrl(values.imageUrl)!,
      imageAlt: values.imageAlt.trim(),
      badge: (values.badge.trim() || null) as ProductBadge | null,
      stockQuantity: Number(values.stock),
    },
  };
}
