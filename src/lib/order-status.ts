// Customer-facing labels for order_status. Safe to import anywhere.

import type { orderStatus } from "@/db/orders";

export type OrderStatus = (typeof orderStatus.enumValues)[number];

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: "success" | "pending" | "danger" | "muted" }
> = {
  paid: { label: "Paid", tone: "success" },
  processing: { label: "Payment processing", tone: "pending" },
  pending: { label: "Payment pending", tone: "pending" },
  failed: { label: "Payment failed", tone: "danger" },
  expired: { label: "Expired", tone: "muted" },
  canceled: { label: "Cancelled", tone: "muted" },
};

// Never charged: hidden from order history unless asked for.
export const UNFINISHED_STATUSES: OrderStatus[] = ["expired", "canceled"];

export const formatOrderDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
