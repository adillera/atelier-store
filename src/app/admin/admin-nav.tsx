"use client";

import { usePathname } from "next/navigation";

import { SideNav } from "@/components/side-nav";

import { ADMIN_SECTIONS } from "./admin-sections";

// usePathname() is request data on dynamic routes, so the layout renders this
// inside <Suspense> with AdminNavLinks (nothing highlighted) as the fallback.
export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return <SideNav label="Admin" sections={ADMIN_SECTIONS} pathname={pathname} />;
}
