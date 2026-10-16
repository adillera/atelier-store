import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-prose section stack flex-1 items-center justify-center gap-6 text-center">
      <p className="text-eyebrow">Error 404</p>
      <h1 className="heading-display-sm">This page could not be found</h1>
      <p className="text-ink-muted">
        The piece you are looking for may have moved or is no longer available.
      </p>
      <Link href="/" className="btn btn-secondary mt-2">
        Return Home
      </Link>
    </main>
  );
}
