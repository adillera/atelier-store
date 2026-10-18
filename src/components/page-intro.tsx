import Link from "next/link";

// Centered breadcrumb + display heading used at the top of utility pages.
export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="container-page stack items-center gap-4 pt-8 pb-8 text-center lg:pt-12 lg:pb-10">
      <nav aria-label="Breadcrumb">
        <ol className="text-eyebrow flex gap-2">
          <li>
            <Link href="/" className="link-reveal">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <h1 className="heading-display">{title}</h1>
      {children}
    </header>
  );
}
