import Link from "next/link";

const navigation = [
  { href: "/new", label: "New In" },
  { href: "/women", label: "Women" },
  { href: "/men", label: "Men" },
  { href: "/bags", label: "Bags" },
  { href: "/shoes", label: "Shoes" },
];

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d={path} />
    </svg>
  );
}

const icons = {
  search: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21",
  account: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
  bag: "M5 8h14l-1 13H6L5 8Zm3.5 0V6.5a3.5 3.5 0 0 1 7 0V8",
  menu: "M3 7h18M3 12h18M3 17h18",
};

export function SiteHeader() {
  return (
    <>
      <div className="bg-ink text-paper">
        <p className="container-page text-eyebrow py-2 text-center text-paper/80">
          Complimentary shipping &amp; returns
        </p>
      </div>

      <header className="sticky top-0 z-40 bg-paper hairline-b">
        <div className="container-page grid h-(--header-height) grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            {/* Mobile: native disclosure, no client JS needed. */}
            <details className="group lg:hidden">
              <summary className="btn-icon -ml-3 list-none [&::-webkit-details-marker]:hidden">
                <Icon path={icons.menu} />
                <span className="sr-only">Open menu</span>
              </summary>
              <nav
                aria-label="Main"
                className="absolute inset-x-0 top-full bg-paper hairline-b"
              >
                <ul className="container-page stack py-4">
                  {navigation.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-label block py-3">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>

            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex gap-8">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-label link-reveal">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <Link
            href="/"
            className="font-display text-xl tracking-[0.3em] uppercase lg:text-2xl"
          >
            Atelier
          </Link>

          <div className="-mr-3 flex items-center justify-end">
            <Link href="/search" className="btn-icon">
              <Icon path={icons.search} />
              <span className="sr-only">Search</span>
            </Link>
            <Link href="/account" className="btn-icon hidden sm:inline-flex">
              <Icon path={icons.account} />
              <span className="sr-only">Account</span>
            </Link>
            <Link href="/bag" className="btn-icon">
              <Icon path={icons.bag} />
              <span className="sr-only">Shopping bag</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
