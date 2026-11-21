import { describe, expect, it } from "vitest";
import { applyOperationFilters, operationDates, operationIdFilter, operationRange, safeOperationSearch } from "./operationsList";

describe("operations list boundaries", () => {
  it("fetches distinct bounded pages", () => {
    expect(operationRange(1)).toEqual([0, 19]);
    expect(operationRange(3)).toEqual([40, 59]);
    expect(operationRange(0)).toEqual([0, 19]);
  });
  it("includes the full Karachi end day without including the following day", () => {
    expect(operationDates("2026-11-21", "2026-11-21")).toEqual({ start: "2026-11-20T19:00:00.000Z", end: "2026-11-21T19:00:00.000Z", invalid: false });
    expect(operationDates("2026-11-22", "2026-11-21").invalid).toBe(true);
  });
  it("bounds short displayed order IDs using UUID range rather than casting", () => {
    expect(operationIdFilter("1234abcd")).toBe("and(id.gte.1234abcd-0000-0000-0000-000000000000,id.lte.1234abcd-ffff-ffff-ffff-ffffffffffff)");
    expect(operationIdFilter("hello")).toBeNull();
  });
  it("does not allow search to inject extra filter syntax", () => {
    expect(safeOperationSearch("علی,)(status.eq.cancelled)%*")).toBe("علیstatus.eq.cancelled");
  });
  it("sends date and search restrictions to the query before pagination", () => {
    const calls: unknown[] = [];
    const builder = { gte: (...args: unknown[]) => { calls.push(args); return builder; }, lt: (...args: unknown[]) => { calls.push(args); return builder; }, or: (...args: unknown[]) => { calls.push(args); return builder; } };
    applyOperationFilters(builder, "2026-11-21", "2026-11-21", "Kffc", ["receiver_name"], ["restaurant_id.in.(abc)"]);
    expect(calls).toEqual([["created_at", "2026-11-20T19:00:00.000Z"], ["created_at", "2026-11-21T19:00:00.000Z"], ["restaurant_id.in.(abc),receiver_name.ilike.%Kffc%"]]);
  });
});