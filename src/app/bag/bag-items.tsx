"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { BagLine as BagLineData } from "@/lib/cart";

import { BagLine } from "./bag-line";

// The list of bag lines. When a line disappears after the server confirms a
// removal, it says so (visibly and to screen readers) and moves focus to the
// list heading, since the focused Remove button no longer exists.
export function BagItems({
  lines,
  itemLabel,
}: {
  lines: BagLineData[];
  itemLabel: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const [prevLines, setPrevLines] = useState(lines);
  if (lines !== prevLines) {
    const removed = prevLines.filter(
      (prev) => !lines.some((line) => line.product.id === prev.product.id),
    );
    setPrevLines(lines);
    setAnnouncement(
      removed.length > 0
        ? `Removed ${removed.map((line) => line.product.name).join(", ")} from your bag.`
        : "",
    );
  }

  const count = useRef(lines.length);
  useEffect(() => {
    if (lines.length < count.current) headingRef.current?.focus();
    count.current = lines.length;
  }, [lines.length]);

  return (
    <section aria-labelledby="bag-heading">
      <div className="hairline-t flex items-center justify-between gap-4 py-4">
        <h2
          id="bag-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-eyebrow outline-none"
        >
          Your Bag · {itemLabel}
        </h2>
        <Link href="/new" className="text-eyebrow link-reveal">
          Continue Shopping
        </Link>
      </div>
      <p role="status" className={announcement ? "pb-4 text-sm text-ink-muted" : "sr-only"}>
        {announcement}
      </p>
      <ul className="hairline-t">
        {lines.map((line) => (
          <BagLine key={line.product.id} line={line} />
        ))}
      </ul>
    </section>
  );
}
