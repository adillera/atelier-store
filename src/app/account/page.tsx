import Link from "next/link";
import { Suspense } from "react";

import {
  AccountSection,
  AccountSkeleton,
  DetailList,
  formatMemberSince,
} from "@/components/section";
import { getOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

import { OrderList } from "./orders/order-list";

export default function AccountOverviewPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountOverview />
    </Suspense>
  );
}

const shortcuts = [
  {
    href: "/new",
    title: "New Arrivals",
    body: "The latest pieces from our workshops.",
  },
  {
    href: "/search",
    title: "Search",
    body: "Find a piece by name, material or category.",
  },
];

async function AccountOverview() {
  const user = await requireUser("/account");
  const recentOrders = await getOrdersForUser(user.id, { limit: 3 });

  return (
    <div className="stack gap-12">
      <div className="stack gap-2">
        <p className="text-eyebrow">Overview</p>
        <p className="heading-display-sm">Welcome back, {user.name}</p>
      </div>

      <AccountSection
        title="Account Information"
        action={
          <Link href="/account/profile" className="link-cta shrink-0">
            Edit
          </Link>
        }
      >
        <DetailList
          items={[
            { label: "Name", value: user.name },
            { label: "Email", value: user.email },
            { label: "Member Since", value: formatMemberSince(user.createdAt) },
          ]}
        />
      </AccountSection>

      <AccountSection
        title="Recent Orders"
        action={
          recentOrders.length > 0 ? (
            <Link href="/account/orders" className="link-cta shrink-0">
              View All
            </Link>
          ) : undefined
        }
      >
        {recentOrders.length > 0 ? (
          <OrderList orders={recentOrders} />
        ) : (
          <p className="hairline-t py-6 text-sm text-ink-muted">
            You haven&apos;t placed any orders yet.
          </p>
        )}
      </AccountSection>

      {/* Convenience only: /admin enforces the role itself. */}
      {user.role === "admin" ? (
        <AccountSection title="Admin">
          <Link
            href="/admin"
            className="hairline flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface"
          >
            <span className="stack gap-1">
              <span className="text-label">Admin Tools</span>
              <span className="text-sm text-ink-muted">
                Products, stock, categories and orders.
              </span>
            </span>
            <span className="link-cta shrink-0">Open</span>
          </Link>
        </AccountSection>
      ) : null}

      <AccountSection title="Continue Shopping">
        <ul className="grid gap-px bg-line sm:grid-cols-2">
          {shortcuts.map((shortcut) => (
            <li key={shortcut.href} className="bg-paper">
              <Link
                href={shortcut.href}
                className="group stack h-full gap-2 bg-surface p-6 transition-colors hover:bg-surface-strong"
              >
                <span className="text-label">{shortcut.title}</span>
                <span className="text-sm text-ink-muted">{shortcut.body}</span>
                <span className="link-cta mt-2 self-start">Shop Now</span>
              </Link>
            </li>
          ))}
        </ul>
      </AccountSection>
    </div>
  );
}
