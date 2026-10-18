import { ORDER_STATUS, type OrderStatus } from "@/lib/order-status";

const toneClass = {
  success: "bg-success",
  pending: "bg-ink",
  danger: "bg-danger",
  muted: "bg-ink-subtle",
} as const;

// `label` overrides the wording when the page knows more than the database
// status (e.g. a pending order Stripe says is already paid).
export function OrderStatusBadge({
  status,
  label: override,
}: {
  status: OrderStatus;
  label?: string;
}) {
  const { label: base, tone } = ORDER_STATUS[status];
  const label = override ?? base;
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs ${
        tone === "danger" ? "text-danger" : tone === "muted" ? "text-ink-muted" : ""
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${toneClass[tone]}`} />
      {label}
    </span>
  );
}
