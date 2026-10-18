import type { Metadata } from "next";
import { Suspense } from "react";

import { PageIntro } from "@/components/page-intro";

import { AccountNav, AccountNavLinks } from "./account-nav";

export const metadata: Metadata = {
  title: { default: "Account", template: "%s | Account | Atelier Store" },
  robots: { index: false },
};

// Static chrome only: the session is read by each page, inside Suspense.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <main className="flex-1">
      <PageIntro title="My Account" />
      <div className="container-content grid grid-cols-[minmax(0,1fr)] gap-8 pb-(--section-space) lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <Suspense fallback={<AccountNavLinks pathname={null} />}>
          <AccountNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
