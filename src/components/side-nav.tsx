import Link from "next/link";

export type SideNavSection = { href: string; label: string };

// Section navigation for the account and admin areas: tabs across the top on
// phones and tablets, a sidebar from lg up. `pathname` is null while it's
// unknown (the Suspense fallback), in which case nothing is highlighted.
// The first section is the area's root and only matches exactly; the others
// also match their sub-pages (e.g. /account/orders/AT-…).
export function SideNav({
  label,
  sections,
  pathname,
  footer,
}: {
  label: string;
  sections: readonly SideNavSection[];
  pathname: string | null;
  footer?: React.ReactNode;
}) {
  const root = sections[0]?.href;

  return (
    <nav aria-label={label} className="hairline-b lg:border-b-0">
      <ul className="-mb-px flex gap-6 overflow-x-auto lg:stack lg:mb-0 lg:gap-0 lg:hairline-t">
        {sections.map((section) => {
          const current =
            pathname !== null &&
            (section.href === root
              ? pathname === root
              : pathname === section.href || pathname.startsWith(`${section.href}/`));
          return (
            <li key={section.href} className="shrink-0 lg:hairline-b">
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={`text-label block py-3 lg:py-4 ${
                  current
                    ? "border-b border-ink lg:border-b-0"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
        {footer ? <li className="ml-auto shrink-0 lg:ml-0">{footer}</li> : null}
      </ul>
    </nav>
  );
}
