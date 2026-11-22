type PricedMenuItem = { price: number; variants?: unknown };

/** Display only persisted, positive menu prices; this is not a checkout quote. */
export function foodStartingPrice(items: PricedMenuItem[]): number | null {
  const prices = items.flatMap(item => [item.price, ...(Array.isArray(item.variants) ? item.variants : [])
    .map((variant: unknown) => typeof variant === "object" && variant !== null && "price" in variant ? variant.price : undefined)])
    .map(Number).filter(price => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}