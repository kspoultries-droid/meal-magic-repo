import { describe, it, expect } from "vitest";
import { shopDeliveryStatus } from "./shopDeliveryStatus";
const ok = { city_id: "c", pickup_lat: 28.4, pickup_lng: 70.3, ships_nationwide: false, advance_percent: 0 };
describe("shopDeliveryStatus", () => {
  it("local-only shop has local mode and no flags", () => expect(shopDeliveryStatus(ok)).toEqual({ modes: ["local"], flags: [] }));
  it("nationwide shop shows courier mode too", () => expect(shopDeliveryStatus({ ...ok, ships_nationwide: true }).modes).toEqual(["local", "courier"]));
  it("missing pin is flagged", () => expect(shopDeliveryStatus({ ...ok, pickup_lng: null }).flags).toContain("no_pin"));
  it("missing city is flagged", () => expect(shopDeliveryStatus({ ...ok, city_id: null }).flags).toContain("no_city"));
  it("advance above 0 is flagged because no gateway exists", () => expect(shopDeliveryStatus({ ...ok, advance_percent: 50 }).flags).toContain("advance_needs_gateway"));
});
