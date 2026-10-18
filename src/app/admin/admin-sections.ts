// Admin areas, shared by the nav (client) and the overview page (server).
// Kept out of admin-nav.tsx: a "use client" module's exports are client
// references on the server, not their values.
export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
] as const;
