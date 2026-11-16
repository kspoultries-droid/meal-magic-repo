export type DeliveryPromise = { kind: "same_city" | "courier" | "local_only" | "unknown"; en: string; ur: string };

/** Delivery promise shown on product pages, based on buyer city vs shop city. */
export function deliveryPromise(buyerCityId: string | null | undefined, shopCityId: string | null | undefined, shipsNationwide: boolean, shopCityName?: string | null): DeliveryPromise {
  const name = shopCityName || "";
  if (!buyerCityId || !shopCityId) {
    return name
      ? { kind: "unknown", en: `${name}: 2–4 hrs · Other cities: 2–4 days`, ur: `${name} میں 2–4 گھنٹے · دیگر شہر 2–4 دن` }
      : { kind: "unknown", en: "Same city: 2–4 hrs", ur: "اسی شہر میں 2–4 گھنٹے" };
  }
  if (buyerCityId === shopCityId) return { kind: "same_city", en: "Same-day delivery (2–4 hrs)", ur: "آج ہی ترسیل (2–4 گھنٹے)" };
  if (shipsNationwide) return { kind: "courier", en: "Courier delivery (2–4 days)", ur: "کوریئر ڈیلیوری (2–4 دن)" };
  return { kind: "local_only", en: name ? `Only delivers in ${name}` : "Only delivers in shop's city", ur: name ? `صرف ${name} میں ڈیلیوری` : "صرف دکان کے شہر میں ڈیلیوری" };
}
