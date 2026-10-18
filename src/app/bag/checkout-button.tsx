"use client";

import { useActionState } from "react";

import { startCheckout, type CheckoutState } from "@/app/checkout/actions";

// Submits nothing but intent: the server rebuilds the order from the bag
// cookie and database prices, then redirects to Stripe.
export function CheckoutButton({
  disabled,
  signedIn,
}: {
  disabled: boolean;
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    startCheckout,
    {},
  );

  return (
    <form action={formAction} className="stack gap-3">
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={disabled || pending}
        aria-describedby={state.error ? "checkout-error" : undefined}
      >
        {pending
          ? "Starting Checkout…"
          : signedIn
            ? "Checkout"
            : "Sign In to Check Out"}
      </button>
      {state.error ? (
        <p
          id="checkout-error"
          key={state.key}
          role="alert"
          className="border border-danger px-4 py-3 text-xs text-danger"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
