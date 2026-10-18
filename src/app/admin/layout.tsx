import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { isAdmin } from "@/lib/session";

import { AdminNav, AdminNavLinks } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Atelier Store" },
  robots: { index: false },
};

// Access control does NOT live here. Layouts aren't re-rendered on client
// navigation between their pages, so every admin page calls requireAdmin()
// and every admin action calls requireAdminAction() itself.
//
// This layout only decides whether to draw the admin chrome, so that
// non-admins never see the admin navigation: they get the bare page, whose
// own guard redirects them to sign-in or answers 404.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<div aria-hidden="true" className="min-h-[60vh]" />}>
        <AdminChrome>{children}</AdminChrome>
      </Suspense>
    </main>
  );
}

async function AdminChrome({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return children;

  return (
    <>
      <div className="hairline-b">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <p className="text-label">Atelier Admin</p>
          <Link href="/" className="text-eyebrow link-reveal">
            View Store
          </Link>
        </div>
      </div>
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 pt-6 pb-(--section-space) lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:pt-10">
        <Suspense fallback={<AdminNavLinks pathname={null} />}>
          <AdminNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
