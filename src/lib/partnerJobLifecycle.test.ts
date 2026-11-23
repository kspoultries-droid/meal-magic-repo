import { describe, it, expect } from "vitest";
import { partnerTransitionAllowed } from "./partnerJobLifecycle";

describe("partner delivery lifecycle", () => {
  it("cancelled orders cannot become delivered or active", () => {
    for (const next of ["delivered", "pending", "assigned"]) expect(partnerTransitionAllowed("cancelled", next)).toBe(false);
  });
  it("delivered orders cannot reopen or cancel", () => {
    for (const next of ["pending", "assigned", "cancelled"]) expect(partnerTransitionAllowed("delivered", next)).toBe(false);
  });
  it("requires assignment before completion", () => {
    expect(partnerTransitionAllowed("pending", "delivered")).toBe(false);
    expect(partnerTransitionAllowed("pending", "assigned")).toBe(true);
    expect(partnerTransitionAllowed("assigned", "delivered")).toBe(true);
  });
  it("allows cancellation only for active jobs", () => {
    expect(partnerTransitionAllowed("pending", "cancelled")).toBe(true);
    expect(partnerTransitionAllowed("assigned", "cancelled")).toBe(true);
    expect(partnerTransitionAllowed("unknown", "cancelled")).toBe(false);
  });
});