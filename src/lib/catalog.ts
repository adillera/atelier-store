// Static storefront content and display helpers. Products live in the
// database: see src/lib/products.ts.
// Images are from Unsplash (https://unsplash.com/license).

export type Collection = {
  slug: string;
  name: string;
  image: string;
  alt: string;
};

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const heroImages = [
  {
    src: unsplash("1539109136881-3be0616acf4b"),
    alt: "Woman in a pale blue coat and wide trousers standing in a cathedral square",
  },
  {
    src: unsplash("1581044777550-4cfa60707c03"),
    alt: "Woman in a ruffled pink dress holding sunglasses in a golden field",
  },
];

export const collections: Collection[] = [
  {
    slug: "women",
    name: "Women",
    image: unsplash("1496747611176-843222e1e57c"),
    alt: "Woman in a floral wrap dress walking by the sea",
  },
  {
    slug: "men",
    name: "Men",
    image: unsplash("1507679799987-c73779587ccf"),
    alt: "Man in a navy suit adjusting his cuff",
  },
  {
    slug: "bags",
    name: "Bags",
    image: unsplash("1598532163257-ae3c6b2524b6"),
    alt: "Woven tan leather shoulder bag with a gold chain strap",
  },
  {
    slug: "eyewear",
    name: "Eyewear",
    image: unsplash("1511499767150-a48a237f0083"),
    alt: "Round gold-frame sunglasses on a white surface",
  },
];

export const editorial = {
  feature: {
    image: unsplash("1617137968427-85924c800a22"),
    alt: "Man in a navy suit and white shirt walking past a glass building",
  },
  craft: {
    image: unsplash("1558769132-cb1aea458c5e"),
    alt: "Neutral knitwear hanging on a rail beside dried grasses",
  },
};

// Whole-dollar prices drop the cents ($2,450); others keep them ($12.50).
export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = "in-stock" | "low-stock" | "sold-out";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "sold-out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}
