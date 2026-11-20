import { describe, expect, it } from "vitest";
import { dispatchInterface } from "./courier";

describe("persisted delivery mode dispatch controls", () => {
  it("courier orders never receive local rider controls", () => {
    expect(dispatchInterface("grocery_cart", { delivery_method: "courier" })).toEqual({
      mode: "courier", showRiderControls: false, canRecordShipment: true,
    });
  });
  it("local grocery retains rider controls and cannot record a courier shipment", () => {
    expect(dispatchInterface("grocery_cart", { delivery_method: "local_rider" })).toEqual({
      mode: "local", showRiderControls: true, canRecordShipment: false,
    });
  });
  it("ration/photo orders retain their existing rider workflow", () => {
    expect(dispatchInterface("grocery_list", {}).showRiderControls).toBe(true);
  });
  it("missing mode is not assumed to be a local service", () => {
    expect(dispatchInterface("grocery_cart", {}).mode).toBe("unknown");
    expect(dispatchInterface("grocery_cart", {}).showRiderControls).toBe(false);
  });
  it("legacy CN is visible without permitting snapshot conversion", () => {
    expect(dispatchInterface("grocery_cart", { tracking_number: "CN-123" })).toEqual({
      mode: "courier", showRiderControls: false, canRecordShipment: false,
    });
  });
  it("conflicting local snapshot and courier evidence cannot be rewritten", () => {
    expect(dispatchInterface("grocery_cart", { delivery_method: "local_rider", courier_name: "Recorded carrier" }).canRecordShipment).toBe(false);
  });
  it("unsupported delivery modes need review, not a fabricated service", () => {
    expect(dispatchInterface("grocery_cart", { delivery_method: "unconfigured" })).toEqual({
      mode: "unknown", showRiderControls: false, canRecordShipment: false,
    });
  });
});