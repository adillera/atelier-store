"use server";

// Admin product mutations. Each action authorizes itself first, then
// re-validates every field server-side (the form's checks are only for
// instant feedback), then writes through src/lib/admin.ts.

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { insertProduct, listCategories, updateProduct } from "@/lib/admin";
import {
  parseProductForm,
  PRODUCT_FIELDS,
  type ProductFieldErrors,
  type ProductFormValues,
} from "@/lib/admin-validation";
import { requireAdminAction } from "@/lib/session";

export type ProductFormState = {
  errors?: ProductFieldErrors;
  error?: string;
  values?: ProductFormValues;
  // After a stock conflict: the stock the form should now treat as current.
  expectedStock?: number;
  saved?: boolean;
  key?: number;
};

function readValues(formData: FormData): ProductFormValues {
  const values = {} as ProductFormValues;
  for (const field of PRODUCT_FIELDS) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

function readInt(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

const SLUG_TAKEN = "Another product already uses this slug.";

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdminAction();

  const values = readValues(formData);
  const categoryIds = (await listCategories()).map((category) => category.id);
  const parsed = parseProductForm(values, categoryIds);
  if ("errors" in parsed) return { errors: parsed.errors, values, key: Date.now() };

  const result = await insertProduct(parsed.input);
  if (!result.ok) return { errors: { slug: SLUG_TAKEN }, values, key: Date.now() };

  updateTag("products");
  redirect(`/admin/products/${result.slug}?saved=created`);
}

export async function editProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdminAction();

  const productId = readInt(formData, "productId");
  const expectedStock = readInt(formData, "expectedStock");
  const originalSlug = formData.get("originalSlug");
  if (productId === null || expectedStock === null || typeof originalSlug !== "string") {
    return { error: "This form is out of date. Reload the page and try again.", key: Date.now() };
  }

  const values = readValues(formData);
  const categoryIds = (await listCategories()).map((category) => category.id);
  const parsed = parseProductForm(values, categoryIds);
  if ("errors" in parsed) {
    return { errors: parsed.errors, values, expectedStock, key: Date.now() };
  }

  const result = await updateProduct(productId, parsed.input, expectedStock);
  if (!result.ok) {
    switch (result.reason) {
      case "slug-taken":
        return { errors: { slug: SLUG_TAKEN }, values, expectedStock, key: Date.now() };
      case "not-found":
        return { error: "This product no longer exists.", key: Date.now() };
      case "stock-changed":
        return {
          errors: {
            stock: `Stock changed to ${result.currentStock} while you were editing (checkouts reserve and release stock). Review the number and save again.`,
          },
          values,
          expectedStock: result.currentStock,
          key: Date.now(),
        };
    }
  }

  updateTag("products");
  if (result.slug !== originalSlug) {
    redirect(`/admin/products/${result.slug}?saved=updated`);
  }
  return {
    saved: true,
    values,
    expectedStock: parsed.input.stockQuantity,
    key: Date.now(),
  };
}
