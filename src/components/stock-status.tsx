import { getStockStatus } from "@/lib/catalog";

const tones = {
  "in-stock": "bg-success",
  "low-stock": "bg-sale",
  "sold-out": "bg-ink-subtle",
};

export function StockStatus({ stock }: { stock: number }) {
  const status = getStockStatus(stock);
  const label =
    status === "sold-out"
      ? "Sold out"
      : status === "low-stock"
        ? `Only ${stock} left`
        : "In stock";

  return (
    <p className="flex items-center gap-2 text-sm">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tones[status]}`} />
      {label}
    </p>
  );
}
