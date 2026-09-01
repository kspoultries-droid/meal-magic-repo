export type DeliveryMode = "rider" | "loader" | "intercity" | "courier";

export interface DeliveryQuote {
  mode: DeliveryMode;
  distance_km: number;
  weight_kg: number;
  vehicle_code: string | null;
  vehicle_name: string | null;
  vehicle_type_id: string | null;
  fee: number;
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

export const calculateCartWeight = (items: Array<{ quantity: number; weight_kg?: number | null; weight?: string | null }>) =>
  items.reduce((total, item) => {
    const parsed = Number(item.weight_kg ?? item.weight ?? 0.5);
    return total + Math.max(0.1, Number.isFinite(parsed) ? parsed : 0.5) * item.quantity;
  }, 0);

export const formatFeeBreakdown = (quote: DeliveryQuote) => {
  const parts = [];
  if (quote.breakdown.base > 0) parts.push(`بیس Rs ${Math.round(quote.breakdown.base)}`);
  if (quote.breakdown.distance_fee > 0) parts.push(`فاصلہ Rs ${Math.round(quote.breakdown.distance_fee)}`);
  if (quote.breakdown.weight_fee > 0) parts.push(`وزن Rs ${Math.round(quote.breakdown.weight_fee)}`);
  return parts.length ? parts.join(" + ") : "کوئی اضافی فیس نہیں";
};
