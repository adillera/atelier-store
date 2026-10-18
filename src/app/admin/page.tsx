import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/session";

import { ADMIN_SECTIONS } from "./admin-sections";
import { AdminPageHeader, AdminSkeleton } from "./admin-page";

export const metadata: Metadata = {
  title: { absolute: "Admin | Atelier Store" },
};

const descriptions: Record<string, string> = {
  "/admin/products": "View, create and edit products.",
  "/admin/stock": "See current stock and update quantities.",
  "/admin/categories": "Create, rename and remove categories.",
  "/admin/orders": "Review orders from every customer.",
};

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOverview />
    </Suspense>
  );
}

async function AdminOverview() {
  const admin = await requireAdmin("/admin");

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description={`Signed in as ${admin.email}.`}
      />
      <ul className="grid gap-px bg-line sm:grid-cols-2">
        {ADMIN_SECTIONS.slice(1).map((section) => (
          <li key={section.href} className="bg-paper">
            <Link
              href={section.href}
              className="stack h-full gap-2 bg-surface p-6 transition-colors hover:bg-surface-strong"
            >
              <span className="text-label">{section.label}</span>
              <span className="text-sm text-ink-muted">
                {descriptions[section.href]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
