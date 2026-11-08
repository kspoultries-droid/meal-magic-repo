import { describe, it, expect } from "vitest";
import { filterStoresByReach } from "@/lib/groceryReach";

const ryk = { id: "a", city_id: "ryk", pickup_lat: 28.42, pickup_lng: 70.3, is_active: true };

describe("grocery reach", () => {
  it("hides a RYK shop for a customer ~130 km away", () => {
    expect(filterStoresByReach([ryk], { lat: 27.5, lng: 69.2 }, { ryk: 6 }, true)).toHaveLength(0);
  });
  it("shows the shop inside the city limit", () => {
    expect(filterStoresByReach([ryk], { lat: 28.44, lng: 70.31 }, { ryk: 6 }, true)).toHaveLength(1);
  });
});
