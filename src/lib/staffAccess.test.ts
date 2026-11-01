import { describe, expect, it } from "vitest";
import { approvalKinds, staffLanding, staffWorkspace } from "./staffAccess";

describe("team work stays within assigned permissions", () => {
  it("dispatcher handles orders and dispatch, not finance, partners or audit", () => {
    const work = staffWorkspace(["orders", "dispatch"]);
    expect(work.operations).toEqual(["orders", "grocery-dispatch", "rider-supervision", "photo-orders"]);
    expect(work.partners).toEqual([]);
    expect(work.finance).toEqual([]);
    expect(work.team).toEqual([]);
  });
  it("support has complaints and refund requests but no dispatch", () => {
    expect(staffWorkspace(["orders", "support"]).operations).toEqual(["orders", "photo-orders", "support"]);
    expect(approvalKinds(["orders", "support"])).toEqual(["refund"]);
  });
  it("finance cannot change global rates or manage partners", () => {
    const work = staffWorkspace(["orders", "finance", "approve"]);
    expect(work.finance).toEqual(["revenue", "payouts", "rider-remit", "rider-pay"]);
    expect(work.partners).toEqual([]);
    expect(approvalKinds(["finance", "approve"])).toEqual(["payout", "other"]);
  });
  it("partner manager starts at applications without rider controls", () => {
    expect(staffLanding(["partners"], false)).toEqual({ section: "partners", sub: "applications" });
    expect(staffWorkspace(["partners"]).partners).toEqual(["applications", "restaurants", "grocery"]);
  });
  it("rider supervisor starts at riders, not other partner work", () => {
    expect(staffLanding(["riders"], false)).toEqual({ section: "partners", sub: "riders" });
    expect(staffWorkspace(["riders"]).partners).toEqual(["riders"]);
    expect(approvalKinds(["riders"])).toEqual([]);
  });
  it("unprivileged accounts have no team work", () => {
    expect(staffLanding([], false)).toEqual({ section: "", sub: "" });
    expect(staffWorkspace([])).toEqual({ operations: [], partners: [], finance: [], team: [] });
  });
});