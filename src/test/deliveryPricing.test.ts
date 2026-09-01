import { describe, it, expect } from "vitest";
import { calculateCartWeight, formatDeliveryMode, formatFeeBreakdown, type DeliveryQuote } from "@/lib/deliveryPricing";

const quote = (over: Partial<DeliveryQuote["breakdown"]> = {}): DeliveryQuote => ({
  mode: "loader",
  distance_km: 4,
  weight_kg: 50,
  vehicle_code: "rickshaw",
  vehicle_name: "رکشہ",
  vehicle_type_id: "id",
  fee: 500,
  needs_quote: false,
  breakdown: { base: 350, per_km: 35, distance_fee: 140, weight_fee: 10, rate_card: "loader", ...over },
});

describe("cart weight", () => {
  it("multiplies per-item weight by quantity", () => {
    expect(calculateCartWeight([{ quantity: 2, weight_kg: 50 }, { quantity: 3, weight_kg: 1 }])).toBe(103);
  });

  it("falls back to a half-kilo default when weight is missing", () => {
    expect(calculateCartWeight([{ quantity: 4 }])).toBe(2);
  });

  it("never treats a zero or invalid weight as free volume", () => {
    expect(calculateCartWeight([{ quantity: 1, weight_kg: 0 }])).toBeCloseTo(0.1);
    expect(calculateCartWeight([{ quantity: 1, weight: "bhaari" }])).toBeCloseTo(0.5);
  });
});

describe("delivery mode labels", () => {
  it("names each mode in Urdu", () => {
    expect(formatDeliveryMode("rider")).toBe("مقامی رائیڈر");
    expect(formatDeliveryMode("loader")).toBe("لوڈر / رکشہ");
    expect(formatDeliveryMode("intercity")).toBe("انٹرسٹی کیریج");
    expect(formatDeliveryMode("courier")).toBe("کورئیر");
    expect(formatDeliveryMode(null)).toBe("ڈلیوری");
  });
});

describe("fee breakdown", () => {
  it("lists every charged component", () => {
    expect(formatFeeBreakdown(quote())).toBe("بیس Rs 350 + فاصلہ Rs 140 + وزن Rs 10");
  });

  it("hides components that cost nothing", () => {
    expect(formatFeeBreakdown(quote({ distance_fee: 0, weight_fee: 0 }))).toBe("بیس Rs 350");
  });

  it("explains a fully free delivery", () => {
    expect(formatFeeBreakdown(quote({ base: 0, distance_fee: 0, weight_fee: 0 }))).toBe("کوئی اضافی فیس نہیں");
  });
});
