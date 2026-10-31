export type DeliveryMode = "rider" | "loader" | "intercity" | "courier";

export interface DeliveryQuote {
  mode: DeliveryMode;
  distance_km: number;
  weight_kg: number;
  vehicle_code: string | null;
  vehicle_name: string | null;
  vehicle_type_id: string | null;
  fee: number;
  customer_fee?: number;
  shipping_cost?: number;
  fee_payer?: string;
  needs_quote: boolean;
  breakdown: {
    base: number;
    per_km: number;
    distance_fee: number;
    weight_fee: number;
    rate_card: string | null;
  };
}

export const formatDeliveryMode = (mode?: string | null) => {
  switch (mode) {
    case "rider": return "مقامی رائیڈر";
    case "loader": return "لوڈر / رکشہ";
    case "intercity": return "انٹرسٹی کیریج";
    case "courier": return "کورئیر";
    default: return "ڈلیوری";
  }
};

/** Reads a weight like "5kg", "500 gm", "1.5 لیٹر" from free text (mirrors DB parse_weight_kg). */
export const parseWeightKg = (text?: string | null): number | null => {
  if (!text) return null;
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|کلو|gm|gms|grams?|g|گرام|ml|ltr|litre|liter|l|لیٹر)(?![a-z])/);
  if (!m) return null;
  let v = Number(m[1]);
  if (["gm", "gms", "gram", "grams", "g", "گرام", "ml"].includes(m[2])) v /= 1000;
  return v > 0 && v <= 2000 ? v : null;
};

/** Billable cart weight in kg. Uses the stored weight; when it is missing or the 0.5 kg default,
 *  a size written in the weight/unit/name ("Rice 5kg") wins. Unknown weights fall back to 0.5 kg,
 *  and a real but tiny weight is still charged a 0.1 kg minimum. */
export const calculateCartWeight = (items: Array<{ quantity: number; weight_kg?: number | null; weight?: string | null; unit?: string | null; name?: string }>) =>
  items.reduce((total, item) => {
    const stored = item.weight_kg === undefined || item.weight_kg === null ? NaN : Number(item.weight_kg);
    const parsed = parseWeightKg(item.unit) ?? parseWeightKg(item.weight) ?? parseWeightKg(item.name);
    const perUnit = (!Number.isFinite(stored) || stored === 0.5) && parsed !== null
      ? parsed
      : Number.isFinite(stored) ? Math.max(0.1, stored) : Number(item.weight) > 0 ? Math.max(0.1, Number(item.weight)) : 0.5;
    return total + perUnit * item.quantity;
  }, 0);

export const formatFeeBreakdown = (quote: DeliveryQuote) => {
  const parts = [];
  if (quote.breakdown.base > 0) parts.push(`بیس Rs ${Math.round(quote.breakdown.base)}`);
  if (quote.breakdown.distance_fee > 0) parts.push(`فاصلہ Rs ${Math.round(quote.breakdown.distance_fee)}`);
  if (quote.breakdown.weight_fee > 0) parts.push(`وزن Rs ${Math.round(quote.breakdown.weight_fee)}`);
  return parts.length ? parts.join(" + ") : "کوئی اضافی فیس نہیں";
};
