import { describe, it, expect } from "vitest";
import { summarizeCity } from "./cityCoverage";

const city = { id: "k", name: "Khairpur", food_enabled: true, grocery_enabled: true, wholesale_enabled: true, grocery_max_km: 6, max_dispatch_km: 6, default_courier: null, courier_advance_percent: 0 };
const shop = { city_id: "k", is_active: true, ships_nationwide: false, pickup_lat: 27.5, pickup_lng: 68.7, advance_percent: 0 };
const rate = { city_id: "k", mode: "rider", is_active: true };

describe("summarizeCity", () => {
  it("flags a 1000 km local radius as unrealistic", () => expect(summarizeCity({ ...city, grocery_max_km: 1000 }, [shop], [rate], [], 1).warnings).toContain("radius_unrealistic"));
  it("flags a city with no riders", () => expect(summarizeCity(city, [shop], [rate], [], 0).warnings).toContain("no_riders"));
  it("flags nationwide shops with no verified courier rate or route", () => expect(summarizeCity(city, [{ ...shop, ships_nationwide: true }], [rate], [], 1).warnings).toContain("nationwide_without_courier_rates"));
  it("does not flag nationwide shops when an active route exists", () => expect(summarizeCity(city, [{ ...shop, ships_nationwide: true }], [rate], [{ from_city_id: "k", is_active: true }], 1).warnings).not.toContain("nationwide_without_courier_rates"));
  it("flags advance payment because no gateway exists", () => expect(summarizeCity(city, [{ ...shop, advance_percent: 50 }], [rate], [], 1).warnings).toContain("advance_without_gateway"));
  it("flags a courier name that is text only", () => expect(summarizeCity({ ...city, default_courier: "Tcs" }, [shop], [rate], [], 1).warnings).toContain("courier_text_only"));
  it("flags shops missing a pickup pin", () => expect(summarizeCity(city, [{ ...shop, pickup_lat: null }], [rate], [], 1).missingPin).toBe(1));
  it("healthy city has no warnings", () => expect(summarizeCity(city, [shop], [rate], [], 2).warnings).toEqual([]));
  it("a nationwide (no-city) courier rate card counts for every city", () => expect(summarizeCity(city, [{ ...shop, ships_nationwide: true }], [rate, { city_id: null, mode: "courier", is_active: true }], [], 1).warnings).not.toContain("nationwide_without_courier_rates"));
});
