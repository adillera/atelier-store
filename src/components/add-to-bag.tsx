"use client";

import Link from "next/link";
import { useActionState } from "react";

import { addToBag, type BagActionState } from "@/app/bag/actions";

// Sends only the product id; the server looks up price and stock.
export function AddToBag({
  productId,
  soldOut,
}: {
  productId: number;
  soldOut: boolean;
}) {
  const [state, formAction, pending] = useActionState<BagActionState, FormData>(
    addToBag,
    {},
  );

  return (
    <form action={formAction} className="stack gap-3">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={soldOut || pending}
      >
        {soldOut ? "Sold Out" : pending ? "Adding…" : "Add to Bag"}
      </button>

      <div aria-live="polite" className="text-sm">
        {state.status === "success" ? (
          <p key={state.key}>
            {state.message}{" "}
            <Link href="/bag" className="link">
              View bag
            </Link>
          </p>
        ) : null}
        {state.status === "error" ? (
          <p key={state.key} className="text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
