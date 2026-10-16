import Image from "next/image";
import Link from "next/link";

import { CollectionCard } from "@/components/collection-card";
import { ProductCard } from "@/components/product-card";
import { collections, editorial, heroImages } from "@/lib/catalog";
import { getNewArrivals } from "@/lib/products";

const services = [
  {
    title: "Complimentary Shipping",
    body: "Express delivery and free returns on every order.",
  },
  {
    title: "Signature Packaging",
    body: "Each piece arrives wrapped in our recycled linen box.",
  },
  {
    title: "Private Appointments",
    body: "Book a fitting with a client advisor in store or online.",
  },
];

export default async function Home() {
  const newArrivals = await getNewArrivals();

  return (
    <main className="flex-1">
      {/* Hero: one portrait on phones, a diptych from tablet up. */}
      <section className="relative grid h-[calc(100svh-var(--header-height)-2rem)] min-h-[32rem] md:grid-cols-2">
        {heroImages.map((image, index) => (
          <div
            key={image.src}
            className={`relative bg-surface ${index > 0 ? "hidden md:block" : ""}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              preload={index === 0}
              sizes="(min-width: 48rem) 50vw, 100vw"
              className="object-cover object-top"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 stack items-center gap-5 px-gutter pb-12 text-center text-paper lg:pb-16">
          <p className="text-eyebrow text-paper">Autumn–Winter 2026</p>
          <h1 className="heading-display-lg">The Quiet Edit</h1>
          <Link href="/new" className="btn btn-inverse mt-2">
            Discover the Collection
          </Link>
        </div>
      </section>

      {/* New arrivals */}
      <section className="section">
        <div className="container-page mb-8 flex items-end justify-between gap-4 lg:mb-10">
          <h2 className="heading-section">New Arrivals</h2>
          <Link href="/new" className="link-cta">
            View All
          </Link>
        </div>
        {/* 8 items fill 2- and 4-column rows; drop the last two in the 3-column range. */}
        <div className="container-page grid-products px-0 lg:px-(--gutter) md:max-xl:[&>:nth-child(n+7)]:hidden">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Editorial feature */}
      <section className="grid-split items-center bg-surface">
        <div className="media-editorial">
          <Image
            src={editorial.feature.image}
            alt={editorial.feature.alt}
            fill
            sizes="(min-width: 48rem) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="stack items-center gap-6 px-gutter py-14 text-center md:py-0">
          <p className="text-eyebrow">The Men&apos;s Story</p>
          <h2 className="heading-display max-w-md">Tailoring, Undone</h2>
          <p className="max-w-sm text-ink-muted">
            Soft-shouldered jackets and supple leathers cut for movement,
            finished by hand and made to wear in.
          </p>
          <Link href="/men" className="btn btn-secondary mt-2">
            Shop Men
          </Link>
        </div>
      </section>

      {/* Collections */}
      <section className="section">
        <div className="container-page stack gap-10 lg:gap-14">
          <div className="stack items-center gap-3 text-center">
            <p className="text-eyebrow">Explore</p>
            <h2 className="heading-display-sm">Shop by Category</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-(--grid-gap-x) gap-y-8 lg:grid-cols-4">
            {collections.map((collection) => (
              <CollectionCard key={collection.slug} collection={collection} />
            ))}
          </div>
        </div>
      </section>

      {/* Craft banner */}
      <section className="relative aspect-4/5 md:aspect-hero">
        <Image
          src={editorial.craft.image}
          alt={editorial.craft.alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 stack items-center justify-center gap-5 px-gutter text-center text-paper">
          <p className="text-eyebrow text-paper">The Atelier</p>
          <h2 className="heading-display max-w-3xl">Made Slowly, Made to Last</h2>
          <p className="max-w-md text-paper/85">
            Every piece begins in a small workshop, with natural fibres and
            leathers chosen for how they age.
          </p>
          <Link href="/craft" className="btn btn-inverse mt-2">
            Our Craft
          </Link>
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <ul className="container-content grid gap-10 text-center md:grid-cols-3">
          {services.map((service) => (
            <li key={service.title} className="stack items-center gap-3">
              <h3 className="text-label">{service.title}</h3>
              <p className="max-w-xs text-sm text-ink-muted">{service.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
