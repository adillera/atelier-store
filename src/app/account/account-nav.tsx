"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { signOut } from "@/app/(auth)/actions";
import { SideNav } from "@/components/side-nav";

const sections = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
] as const;

// The current path is request data on dynamic routes (/account/orders/[n]),
// so the layout renders this inside <Suspense> with AccountNavLinks
// (no tab highlighted) as the fallback.
export function AccountNav() {
  return <AccountNavLinks pathname={usePathname()} />;
}

export function AccountNavLinks({ pathname }: { pathname: string | null }) {
  const [signingOut, startSignOut] = useTransition();

  // Next keeps visited pages mounted (hidden) for back navigation, so a soft
  // redirect would leave this account's details in the DOM. A full page load
  // after signing out discards them.
  function handleSignOut(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSignOut(async () => {
      await signOut();
      // A full load is the point here; see above.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    });
  }

  return (
    <SideNav
      label="Account"
      sections={sections}
      pathname={pathname}
      footer={
        <form action={signOut} onSubmit={handleSignOut}>
          <button
            type="submit"
            disabled={signingOut}
            className="text-label block cursor-pointer py-3 text-ink-muted hover:text-ink disabled:cursor-wait lg:py-4"
          >
            {signingOut ? "Signing Out…" : "Sign Out"}
          </button>
        </form>
      }
    />
  );
}
