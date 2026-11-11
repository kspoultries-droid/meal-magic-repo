import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearPendingShopping, pendingShopping, rememberShopping, safeShoppingPath } from "./shoppingAccess";
import { readDeliveryLocation, writeDeliveryLocation } from "./deliveryLocationStorage";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useRealTimers(); });
describe("delivery address privacy", () => {
  it("does not expose a saved address to a guest or another account", () => {
    writeDeliveryLocation({ id: "home", label: "Home", address: "Private home", lat: 28, lng: 70 }, "owner");
    expect(readDeliveryLocation("owner")?.address).toBe("Private home");
    expect(readDeliveryLocation()).toBeNull(); expect(readDeliveryLocation("other")).toBeNull();
  });
  it("clears location when logging out", () => {
    writeDeliveryLocation({ label: "Home", address: "Private home" }, "owner");
    writeDeliveryLocation(null);
    expect(localStorage.getItem("easylife:delivery-location")).toBeNull();
    expect(readDeliveryLocation("owner")).toBeNull();
  });
  it("allows anonymous GPS but never an untagged legacy home address", () => {
    localStorage.setItem("easylife:delivery-location", JSON.stringify({ label: "Home", address: "Legacy private home" }));
    expect(readDeliveryLocation()).toBeNull();
    writeDeliveryLocation({ source: "gps", label: "Current", address: "Public area", lat: 28, lng: 70 });
    expect(readDeliveryLocation()?.address).toBe("Public area");
  });
  it("keeps a guest-typed address visible while signed out but never inside an account", () => {
    writeDeliveryLocation({ source: "guest_address", label: "Office", address: "Guest typed address", lat: 28, lng: 70 });
    expect(readDeliveryLocation()?.address).toBe("Guest typed address");
    expect(readDeliveryLocation("any-user")).toBeNull();
  });
});
describe("shopping login continuation", () => {
  it("preserves the selected item and quantity until sign-in", () => {
    rememberShopping([{ id: "product", name: "Rice", restaurant: "Shop", image: "", price: 100, quantity: 2 }]);
    expect(pendingShopping()?.items[0]).toMatchObject({ id: "product", quantity: 2 });
    clearPendingShopping(); expect(pendingShopping()).toBeNull();
  });
  it("expires abandoned selections", () => {
    vi.useFakeTimers(); rememberShopping(); vi.advanceTimersByTime(31 * 60 * 1000);
    expect(pendingShopping()).toBeNull();
  });
  it("keeps continuation on this app", () => {
    expect(safeShoppingPath("//evil.example")).toBe("/");
    expect(safeShoppingPath("/\\evil.example")).toBe("/");
    expect(safeShoppingPath("/grocery/123")).toBe("/grocery/123");
  });
});