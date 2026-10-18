"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import { StockStatus } from "@/components/stock-status";
import { formatPrice, getStockStatus } from "@/lib/catalog";
import type { BagLine as BagLineData } from "@/lib/cart";

import { updateBagQuantity, type BagActionState } from "./actions";

const stepClass =
  "flex size-11 cursor-pointer items-center justify-center text-base transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent";

// One form for the whole line: −, + and Remove are submit buttons whose
// name/value carries the new quantity (Remove sends 0). Only the product id
// and quantity reach the server.
export function BagLine({ line }: { line: BagLineData }) {
  const { product, quantity, available } = line;
  const [state, formAction, pending] = useActionState<BagActionState, FormData>(
    updateBagQuantity,
    {},
  );
  const atStock = quantity >= product.stock;
  // Server messages win over the render-time notice for this line.
  const message = state.status === "error" ? state.message : line.notice;

  return (
    <li
      className={`hairline-b grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-6 transition-opacity sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6 ${
        pending ? "opacity-60" : ""
      }`}
      aria-busy={pending}
    >
      <Link href={`/products/${product.slug}`} className="media-product block">
        <Image
          src={product.image}
          alt={product.alt}
          fill
          sizes="(min-width: 40rem) 7.5rem, 5.5rem"
          className={`object-cover ${available ? "" : "grayscale"}`}
        />
      </Link>

      <form action={formAction} className="stack min-w-0 gap-4">
        <input type="hidden" name="productId" value={product.id} />

        <div className="flex items-start justify-between gap-4">
          <div className="stack min-w-0 gap-1">
            <p className="text-eyebrow">{product.category.name}</p>
            <Link href={`/products/${product.slug}`} className="text-sm hover:underline">
              {product.name}
            </Link>
            <p className="text-sm text-ink-muted">{formatPrice(product.priceCents)}</p>
          </div>
          <p className="text-sm whitespace-nowrap">
            {available ? formatPrice(line.lineTotalCents) : "Sold out"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {available ? (
            <div
              role="group"
              aria-label={`Quantity of ${product.name}`}
              className="hairline flex items-center"
            >
              <button
                type="submit"
                name="quantity"
                value={quantity - 1}
                disabled={pending || quantity <= 1}
                className={stepClass}
              >
                <span aria-hidden="true">−</span>
                <span className="sr-only">Decrease quantity</span>
              </button>
              <output aria-live="polite" className="w-8 text-center text-sm tabular-nums">
                {quantity}
              </output>
              <button
                type="submit"
                name="quantity"
                value={quantity + 1}
                disabled={pending || atStock}
                className={stepClass}
              >
                <span aria-hidden="true">+</span>
                <span className="sr-only">Increase quantity</span>
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            type="submit"
            name="quantity"
            value={0}
            disabled={pending}
            className="link-cta cursor-pointer text-ink-muted hover:text-ink"
          >
            Remove<span className="sr-only"> {product.name}</span>
          </button>
        </div>

        {/* One stock message at a time: a problem first, then the limit,
            then a low-stock heads-up. */}
        {message ? (
          <p key={state.key} role="alert" className="text-xs text-danger">
            {message}
          </p>
        ) : available && atStock ? (
          <p className="text-xs text-ink-muted">
            {product.stock === 1
              ? "Only 1 available, and it's in your bag."
              : `All ${product.stock} available are in your bag.`}
          </p>
        ) : available && getStockStatus(product.stock) === "low-stock" ? (
          <StockStatus stock={product.stock} />
        ) : null}
      </form>
    </li>
  );
}
