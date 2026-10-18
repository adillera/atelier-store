"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { StockStatus } from "@/components/stock-status";
import { SelectField, TextAreaField, TextField } from "@/components/text-field";
import {
  LIMITS,
  normalizeImageUrl,
  PRODUCT_BADGES,
  PRODUCT_FIELDS,
  slugify,
  validateProductField,
  type ProductField,
  type ProductFormValues,
} from "@/lib/admin-validation";

import { createProduct, editProduct, type ProductFormState } from "./actions";

type Category = { id: number; name: string };

export type ProductFormProps = {
  categories: Category[];
  initial: ProductFormValues;
  // Present when editing.
  product?: { id: number; slug: string; stock: number; reserved: number };
};

// undefined = no client verdict yet (show the server's), null = valid.
type ClientErrors = Partial<Record<ProductField, string | null>>;

export function ProductForm({ categories, initial, product }: ProductFormProps) {
  const editing = Boolean(product);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    editing ? editProduct : createProduct,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [slugTouched, setSlugTouched] = useState(editing);
  const values = state.values ?? initial;
  const [imageUrl, setImageUrl] = useState(values.imageUrl);
  const [stock, setStock] = useState(values.stock);
  const [dirty, setDirty] = useState(false);
  const expectedStock = state.expectedStock ?? product?.stock ?? 0;
  const categoryIds = categories.map((category) => category.id);

  // A new server response: reset client verdicts and the dirty flag.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setClientErrors({});
    setDirty(false);
    if (state.values) setStock(state.values.stock);
  }

  const errorFor = (field: ProductField) => {
    const client = clientErrors[field];
    return client === undefined ? state.errors?.[field] : (client ?? undefined);
  };
  const input = (name: string) =>
    formRef.current?.elements.namedItem(name) as HTMLInputElement | null;

  // After the server answers with errors, focus the first one.
  useEffect(() => {
    const first = PRODUCT_FIELDS.find((field) => state.errors?.[field]);
    if (first) input(first)?.focus();
  }, [state]);

  function check(field: ProductField, value: string) {
    setClientErrors((errors) => ({
      ...errors,
      [field]: validateProductField(field, value, categoryIds) ?? null,
    }));
  }

  const fieldProps = (field: ProductField) => ({
    name: field,
    error: errorFor(field),
    onBlur: (event: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) =>
      check(field, event.target.value),
    onChange: (event: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) => {
      setDirty(true);
      if (errorFor(field)) check(field, event.target.value);
      if (field === "name" && !slugTouched) {
        const slug = event.target.form?.elements.namedItem("slug");
        if (slug instanceof HTMLInputElement) slug.value = slugify(event.target.value);
      }
      if (field === "slug") setSlugTouched(true);
      if (field === "imageUrl") setImageUrl(event.target.value);
      if (field === "stock") setStock(event.target.value);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const errors: ClientErrors = {};
    let first: ProductField | undefined;
    for (const field of PRODUCT_FIELDS) {
      const message = validateProductField(field, String(data.get(field) ?? ""), categoryIds);
      if (message) {
        errors[field] = message;
        first ??= field;
      }
    }
    if (first) {
      event.preventDefault();
      setClientErrors(errors);
      input(first)?.focus();
    }
  }

  const preview = normalizeImageUrl(imageUrl);
  const stockNumber = /^\d+$/.test(stock) ? Number(stock) : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="stack gap-10">
        <legend className="sr-only">{editing ? "Edit product" : "New product"}</legend>
        {product ? (
          <>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="originalSlug" value={product.slug} />
            <input type="hidden" name="expectedStock" value={expectedStock} />
          </>
        ) : null}

        {state.error ? (
          <p key={state.key} role="alert" className="border border-danger px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <FormSection title="Details">
          <TextField
            label="Name"
            maxLength={LIMITS.name}
            defaultValue={values.name}
            {...fieldProps("name")}
          />
          <TextField
            label="URL Slug"
            maxLength={LIMITS.slug}
            defaultValue={values.slug}
            autoCapitalize="none"
            spellCheck={false}
            hint={
              editing
                ? "Changing the slug changes the product's URL; old links stop working."
                : "Filled in from the name. Used in the product URL: /products/your-slug"
            }
            {...fieldProps("slug")}
          />
          <TextAreaField
            label="Description"
            rows={4}
            maxLength={LIMITS.description}
            defaultValue={values.description}
            {...fieldProps("description")}
          />
          <TextAreaField
            label="Details"
            rows={5}
            defaultValue={values.details}
            hint={`One per line, up to ${LIMITS.detailLines}. Shown under "Product Details".`}
            {...fieldProps("details")}
          />
        </FormSection>

        <FormSection title="Price & Category">
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Price (USD)"
              inputMode="decimal"
              defaultValue={values.price}
              placeholder="1250.00"
              hint="Prices in open checkouts and past orders don't change."
              {...fieldProps("price")}
            />
            <SelectField label="Category" defaultValue={values.categoryId} {...fieldProps("categoryId")}>
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
          </div>
          <SelectField label="Badge" defaultValue={values.badge} {...fieldProps("badge")}>
            <option value="">None</option>
            {PRODUCT_BADGES.map((badge) => (
              <option key={badge} value={badge}>
                {badge}
              </option>
            ))}
          </SelectField>
        </FormSection>

        <FormSection title="Image">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div className="stack gap-6">
              <TextField
                label="Image URL"
                type="url"
                inputMode="url"
                defaultValue={values.imageUrl}
                placeholder="https://images.unsplash.com/photo-…"
                {...fieldProps("imageUrl")}
              />
              <TextField
                label="Image Description"
                maxLength={LIMITS.imageAlt}
                defaultValue={values.imageAlt}
                hint="Read aloud by screen readers. Describe the piece, e.g. colour and material."
                {...fieldProps("imageAlt")}
              />
            </div>
            <div className="media-product hidden sm:block" aria-hidden="true">
              {preview ? (
                <Image src={preview} alt="" fill sizes="7rem" className="object-cover" />
              ) : null}
            </div>
          </div>
        </FormSection>

        <FormSection title="Availability">
          <div className="grid items-start gap-6 sm:grid-cols-[12rem_auto_minmax(0,1fr)]">
            <TextField
              label={editing ? "Stock" : "Initial Stock"}
              inputMode="numeric"
              value={stock}
              hint="Pieces available to buy. 0 shows as sold out."
              {...fieldProps("stock")}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm sm:mt-6"
              disabled={stock === "0"}
              onClick={() => {
                setStock("0");
                setDirty(true);
                setClientErrors((errors) => ({ ...errors, stock: null }));
              }}
            >
              Mark Sold Out
            </button>
            <div className="sm:mt-8">
              {stockNumber !== null ? <StockStatus stock={stockNumber} /> : null}
            </div>
          </div>
          {product && product.reserved > 0 ? (
            <p className="text-xs text-ink-muted">
              {product.reserved} {product.reserved === 1 ? "piece is" : "pieces are"} held
              in open checkouts and not included above. They return to stock if those
              checkouts don&apos;t complete.
            </p>
          ) : null}
        </FormSection>

        <div className="hairline-t flex flex-wrap items-center gap-4 pt-6">
          <button type="submit" className="btn btn-primary">
            {pending ? "Saving…" : editing ? "Save Changes" : "Create Product"}
          </button>
          <Link href="/admin/products" className="link-cta">
            Cancel
          </Link>
          <p role="status" className="text-sm text-success">
            {state.saved && !dirty ? "Changes saved." : ""}
          </p>
        </div>
      </fieldset>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack gap-6">
      <h2 className="heading-section hairline-b pb-3">{title}</h2>
      {children}
    </section>
  );
}
