import { describe, it, expect } from "vitest";
import { serviceActions, validQuote } from "./serviceWorkflow";
describe("Service job rules", () => {
 it("requires customer quote approval before starting work", () => { expect(serviceActions("confirmed", "awaiting_quote", false, true)).not.toContain("start"); expect(serviceActions("confirmed", "quote_approved", true, true)).toContain("start"); });
 it("allows completion only after work starts", () => { expect(serviceActions("confirmed", "quote_approved", true, true)).not.toContain("complete"); expect(serviceActions("in_progress", "working", true, true)).toEqual(["complete"]); });
 it("does not allow actions on closed jobs", () => { expect(serviceActions("completed", "completed", true, true)).toEqual([]); expect(serviceActions("cancelled", "cancelled", false, true)).toEqual([]); });
 it("rejects negative quote breakdowns", () => { expect(validQuote(500, -1, 0)).toBe(false); expect(validQuote(500, 200, 0)).toBe(true); });
});
