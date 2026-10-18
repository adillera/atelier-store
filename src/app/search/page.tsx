import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { ProductCard } from "@/components/product-card";
import { ProductRecommendations } from "@/components/product-recommendations";
import { searchProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Search",
  description: "Search ready-to-wear, bags, shoes and accessories from Atelier.",
  robots: { index: false },
};

const MAX_QUERY_LENGTH = 100;

function getQuery(q: string | string[] | undefined) {
  const value = Array.isArray(q) ? q[0] : q;
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

// searchParams are read inside Suspense so the header and an empty search
// field stay in the static App Shell; the query-dependent parts stream in.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="flex-1">
      <header className="container-page stack items-center gap-4 pt-8 pb-8 text-center lg:pt-12 lg:pb-10">
        <nav aria-label="Breadcrumb">
          <ol className="text-eyebrow flex gap-2">
            <li>
              <Link href="/" className="link-reveal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Search</li>
          </ol>
        </nav>
        <h1 className="heading-display">Search</h1>
      </header>

      <div className="container-prose pb-10 lg:pb-14">
        <Suspense fallback={<SearchForm />}>
          <SearchFormWithQuery searchParams={searchParams} />
        </Suspense>
      </div>

      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function SearchForm({ query = "" }: { query?: string }) {
  return (
    <Form action="/search" role="search" className="flex items-end gap-2">
      <label className="stack flex-1 gap-2">
        <span className="sr-only">Search products</span>
        <input
          // Re-mount on navigation so the field reflects the URL's query.
          key={query}
          type="search"
          name="q"
          defaultValue={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Search for bags, jackets, leather…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full border-b border-line-strong bg-transparent text-base placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <button type="submit" className="btn btn-primary btn-sm h-12">
        Search
      </button>
    </Form>
  );
}

async function SearchFormWithQuery({
  searchParams,
}: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  return <SearchForm query={getQuery(q)} />;
}

function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className="pb-(--section-space)">
      <div className="container-page mb-6">
        <div className="hairline-t py-4">
          <div className="h-4 w-24 bg-surface" />
        </div>
      </div>
      <div className="container-page grid-products px-0 lg:px-(--gutter)">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="media-product" />
        ))}
      </div>
    </div>
  );
}

async function SearchResults({
  searchParams,
}: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  const query = getQuery(q);

  if (!query) {
    return <ProductRecommendations title="New Arrivals" />;
  }

  const results = await searchProducts(query);

  if (results.length === 0) {
    return (
      <>
        <section className="container-prose stack items-center gap-4 pb-(--section-space) text-center">
          <p className="heading-display-sm" role="status">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-ink-muted">
            Check the spelling or try a broader term, such as a category or
            material.
          </p>
        </section>
        <ProductRecommendations title="You May Also Like" />
      </>
    );
  }

  return (
    <section aria-label="Search results" className="pb-(--section-space)">
      <div className="container-page mb-6">
        <div className="hairline-t flex items-center justify-between gap-4 py-4">
          <p className="text-eyebrow" role="status">
            {results.length} {results.length === 1 ? "Result" : "Results"} for
            &ldquo;{query}&rdquo;
          </p>
          <Link href="/search" className="text-eyebrow link-reveal shrink-0">
            Clear
          </Link>
        </div>
      </div>
      <div className="container-page grid-products px-0 lg:px-(--gutter)">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
