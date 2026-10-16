import Image from "next/image";
import Link from "next/link";

import type { Collection } from "@/lib/catalog";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link href={`/${collection.slug}`} className="group stack gap-4">
      <div className="media-editorial">
        <Image
          src={collection.image}
          alt={collection.alt}
          fill
          sizes="(min-width: 64rem) 25vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      </div>
      <span className="text-label link-reveal self-start">{collection.name}</span>
    </Link>
  );
}
