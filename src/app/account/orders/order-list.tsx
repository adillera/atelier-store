import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/catalog";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatOrderDate } from "@/lib/order-status";
import type { OrderSummary } from "@/lib/orders";

function describeItems(order: OrderSummary) {
  const [first, ...rest] = order.names;
  const pieces = `${order.itemCount} ${order.itemCount === 1 ? "piece" : "pieces"}`;
  if (!first) return pieces;
  return rest.length > 0 ? `${first} + ${rest.length} more · ${pieces}` : `${first} · ${pieces}`;
}

// Rows of orders, each linking to its details page.
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="hairline-t">
      {orders.map((order) => (
        <li key={order.number} className="hairline-b">
          <Link
            href={`/account/orders/${order.number}`}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
          >
            {/* First piece only, at a fixed width, so the rows line up. */}
            <span aria-hidden="true" className="media-product block w-12 sm:w-14">
              {order.image ? (
                <Image src={order.image} alt="" fill sizes="3.5rem" className="object-cover" />
              ) : null}
            </span>

            <span className="stack min-w-0 gap-1">
              <span className="text-sm font-medium">{order.number}</span>
              <span className="truncate text-xs text-ink-muted">{describeItems(order)}</span>
              <span className="text-xs text-ink-muted">
                Placed {formatOrderDate(order.createdAt)}
              </span>
              <span className="sm:hidden">
                <OrderStatusBadge status={order.status} />
              </span>
            </span>

            <span className="stack items-end gap-2">
              <span className="text-sm tabular-nums">{formatPrice(order.totalCents)}</span>
              <span className="hidden sm:inline">
                <OrderStatusBadge status={order.status} />
              </span>
              <span className="text-eyebrow text-ink group-hover:underline">
                View<span className="sr-only"> order {order.number}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
