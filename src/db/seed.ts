// Seeds the catalog with the storefront's launch products. Safe to re-run:
// rows are upserted by slug, so a re-run resets them (including stock) to
// the values below.
//
//   npm run db:seed
//
// Images are from Unsplash (https://unsplash.com/license).

import { sql } from "drizzle-orm";

import { categories, products } from "./catalog";
import { db } from "./index";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

const categoryData = [
  { slug: "bags", name: "Bags" },
  { slug: "ready-to-wear", name: "Ready-to-wear" },
  { slug: "shoes", name: "Shoes" },
  { slug: "small-leather-goods", name: "Small leather goods" },
];

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  imageAlt: string;
  badge?: "New" | "Limited";
  stockQuantity: number;
  description: string;
  details: string[];
};

// Listed newest first: this order becomes New Arrivals.
const productData: SeedProduct[] = [
  {
    slug: "top-handle-bag",
    name: "Structured Top Handle Bag",
    category: "bags",
    priceCents: 245000,
    imageUrl: unsplash("1594223274512-ad4803739b7c"),
    imageAlt: "Teal grained-leather top-handle bag with a gold push-lock clasp",
    badge: "New",
    stockQuantity: 12,
    description:
      "A compact top handle bag in grained calf leather, built on a rigid frame that holds its shape. The gold-tone push-lock opens onto a suede-lined interior with a single slip pocket.",
    details: [
      "Grained calf leather",
      "Suede lining",
      "Gold-tone hardware",
      "Detachable shoulder strap",
      "W 24 × H 18 × D 10 cm",
      "Made in Italy",
    ],
  },
  {
    slug: "leather-biker-jacket",
    name: "Leather Biker Jacket",
    category: "ready-to-wear",
    priceCents: 390000,
    imageUrl: unsplash("1521223890158-f9f7c3d5d504"),
    imageAlt: "Model wearing a black leather biker jacket over a black tee",
    stockQuantity: 3,
    description:
      "A classic biker silhouette cut from supple lambskin that softens with wear. Asymmetric zip front, notched lapels and a belted hem.",
    details: [
      "Lambskin leather",
      "Cupro lining",
      "Asymmetric zip closure",
      "Three zip pockets",
      "Regular fit",
      "Made in Italy",
    ],
  },
  {
    slug: "pebbled-pump",
    name: "Pebbled Leather Pump",
    category: "shoes",
    priceCents: 89000,
    imageUrl: unsplash("1535043934128-cf0b28d52f95"),
    imageAlt: "Pair of ivory pebbled-leather pointed pumps",
    badge: "Limited",
    stockQuantity: 2,
    description:
      "A pointed-toe pump in ivory pebbled leather, set on a slender stiletto heel. Produced in a limited run for the season.",
    details: [
      "Pebbled calf leather",
      "Leather lining and sole",
      "85 mm heel",
      "Pointed toe",
      "Made in Italy",
    ],
  },
  {
    slug: "bifold-wallet",
    name: "Grained Leather Wallet",
    category: "small-leather-goods",
    priceCents: 52000,
    imageUrl: unsplash("1627123424574-724758594e93"),
    imageAlt: "Brown leather bifold wallet",
    stockQuantity: 0,
    description:
      "A slim bifold wallet in vegetable-tanned grained leather that develops a rich patina over time.",
    details: [
      "Vegetable-tanned leather",
      "Six card slots",
      "Two bill compartments",
      "W 11 × H 9 cm",
      "Made in Spain",
    ],
  },
  {
    slug: "satin-bomber",
    name: "Satin Bomber Jacket",
    category: "ready-to-wear",
    priceCents: 210000,
    imageUrl: unsplash("1591047139829-d91aecb6caea"),
    imageAlt: "Rust satin bomber jacket held on a hanger",
    badge: "New",
    stockQuantity: 8,
    description:
      "A lightweight bomber in fluid duchess satin with ribbed cuffs and hem. Finished with a two-way zip and a contrast lining.",
    details: [
      "Duchess satin",
      "Viscose lining",
      "Two-way zip closure",
      "Ribbed knit trims",
      "Relaxed fit",
      "Made in Portugal",
    ],
  },
  {
    slug: "knit-poncho",
    name: "Fringed Knit Poncho",
    category: "ready-to-wear",
    priceCents: 135000,
    imageUrl: unsplash("1434389677669-e08b4cac3105"),
    imageAlt: "Cream crochet poncho with fringe on a hanger",
    stockQuantity: 5,
    description:
      "An open-stitch poncho hand-crocheted in undyed cotton and finished with a knotted fringe.",
    details: [
      "Organic cotton",
      "Hand-crocheted",
      "V-neck",
      "Knotted fringe hem",
      "One size",
      "Made in Peru",
    ],
  },
  {
    slug: "jogger-trouser",
    name: "Silk Jogger Trouser",
    category: "ready-to-wear",
    priceCents: 115000,
    imageUrl: unsplash("1594633312681-425c7b97ccd1"),
    imageAlt: "Model wearing blush cuffed trousers and sandals",
    stockQuantity: 0,
    description:
      "A tailored take on the jogger in washed silk, with an elasticated waist, patch pockets and gathered cuffs.",
    details: [
      "Washed silk",
      "Elasticated drawstring waist",
      "Front patch pockets",
      "Gathered ankle cuffs",
      "Made in Italy",
    ],
  },
  {
    slug: "leather-sneaker",
    name: "Two-tone Leather Sneaker",
    category: "shoes",
    priceCents: 75000,
    imageUrl: unsplash("1603808033192-082d6919d3e1"),
    imageAlt: "White and taupe leather sneaker on a rubber cupsole",
    stockQuantity: 20,
    description:
      "A minimal low-top sneaker in grained calf leather and nubuck on a stitched rubber cupsole.",
    details: [
      "Calf leather and nubuck upper",
      "Leather lining",
      "Stitched rubber cupsole",
      "Made in Italy",
    ],
  },
];

async function seed() {
  const categoryRows = await db
    .insert(categories)
    .values(categoryData)
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: sql`excluded.name` },
    })
    .returning({ id: categories.id, slug: categories.slug });

  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // Space created_at a minute apart so New Arrivals keeps the order above.
  const now = Date.now();
  const productRows = productData.map(({ category, ...product }, index) => {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Unknown category "${category}"`);
    return {
      ...product,
      badge: product.badge ?? null,
      categoryId,
      createdAt: new Date(now - index * 60_000),
    };
  });

  // A single multi-row upsert, so it applies atomically.
  await db
    .insert(products)
    .values(productRows)
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        details: sql`excluded.details`,
        priceCents: sql`excluded.price_cents`,
        imageUrl: sql`excluded.image_url`,
        imageAlt: sql`excluded.image_alt`,
        badge: sql`excluded.badge`,
        stockQuantity: sql`excluded.stock_quantity`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    });

  console.log(
    `Seeded ${categoryRows.length} categories and ${productRows.length} products.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
