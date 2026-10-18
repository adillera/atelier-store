import Link from "next/link";

// Messages about checkout shown above the bag: a checkout that's still open
// on Stripe, or how the last one ended (from /checkout/cancel's redirect).

export type OpenCheckoutNotice =
  | { state: "open"; url: string; cancelUrl: string; minutesLeft: number }
  | { state: "confirming"; orderNumber: string };

const RETURN_MESSAGES: Record<string, { tone: "neutral" | "danger"; text: string }> = {
  canceled: {
    tone: "neutral",
    text: "Checkout cancelled. Nothing was charged, and your bag is as you left it.",
  },
  expired: {
    tone: "neutral",
    text: "Your checkout expired before payment, so nothing was charged. Your bag is ready when you are.",
  },
  failed: {
    tone: "danger",
    text: "Your payment didn't go through and nothing was charged. Please try again or use another payment method.",
  },
};

function Box({
  tone,
  children,
}: {
  tone: "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div className="container-content pb-6">
      <div
        role="status"
        className={`stack gap-3 border px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between ${
          tone === "danger" ? "border-danger text-danger" : "border-line-strong"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function CheckoutNotice({
  open,
  returned,
}: {
  open?: OpenCheckoutNotice;
  returned?: string;
}) {
  if (open?.state === "open") {
    return (
      <Box tone="neutral">
        <p>
          <span className="font-medium">Your checkout is still open.</span>{" "}
          <span className="text-ink-muted">
            Your pieces are reserved for about {open.minutesLeft}{" "}
            {open.minutesLeft === 1 ? "minute" : "minutes"}. Checking out again
            replaces it with your current bag.
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {/* Plain links: these leave the site / change state, so no prefetch. */}
          <a href={open.url} className="btn btn-primary btn-sm">
            Return to Payment
          </a>
          <a href={open.cancelUrl} className="btn btn-secondary btn-sm">
            Cancel Checkout
          </a>
        </div>
      </Box>
    );
  }

  if (open?.state === "confirming") {
    return (
      <Box tone="neutral">
        <p>
          <span className="font-medium">We&apos;re confirming your payment.</span>{" "}
          <span className="text-ink-muted">This usually takes a few seconds.</span>
        </p>
        <Link
          href={`/checkout/success/${open.orderNumber}`}
          className="btn btn-secondary btn-sm shrink-0"
        >
          View Order
        </Link>
      </Box>
    );
  }

  const message = returned ? RETURN_MESSAGES[returned] : undefined;
  if (!message) return null;
  return (
    <Box tone={message.tone}>
      <p>{message.text}</p>
    </Box>
  );
}
