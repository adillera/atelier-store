"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Re-renders the page every few seconds while a paid order waits for
// Stripe's webhook. If confirmation takes unusually long, it stops and says
// so, with a way to try again.
export function RefreshWhilePending({ attempts = 20, intervalMs = 3000 }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= attempts) return;
    const timer = setTimeout(() => {
      router.refresh();
      setCount((value) => value + 1);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [count, attempts, intervalMs, router]);

  if (count < attempts) {
    return (
      <span
        aria-hidden="true"
        className="mt-2 size-2 animate-pulse rounded-full bg-ink"
      />
    );
  }
  return (
    <p className="max-w-md text-sm text-ink-muted">
      This is taking longer than usual. Your payment is safe and this page will
      show it once confirmed.{" "}
      <button
        type="button"
        onClick={() => setCount(0)}
        className="link cursor-pointer"
      >
        Check again
      </button>
    </p>
  );
}
