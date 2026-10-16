import Link from "next/link";

const columns = [
  {
    title: "Client Services",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "The House",
    links: [
      { href: "/about", label: "About Atelier" },
      { href: "/craft", label: "Craftsmanship" },
      { href: "/stores", label: "Store Locator" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Sale" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="container-page section grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="stack gap-4">
          <p className="font-display text-2xl tracking-[0.3em] uppercase">Atelier</p>
          <p className="max-w-xs text-sm text-paper/70">
            Considered pieces, made in small runs by independent workshops.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="stack gap-4">
            <h2 className="text-eyebrow text-paper/60">{column.title}</h2>
            <ul className="stack gap-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm link-reveal">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-paper/15">
        <p className="container-page text-eyebrow py-6 text-paper/60">
          Atelier Store · Demo storefront
        </p>
      </div>
    </footer>
  );
}
