import { describe, expect, it } from "vitest";
import { cardDate, cardDatesValid, validCardLink, visibleBazarCards } from "@/lib/bazarCards";

const complete = { title: "Shoes", brand_name: "Shop", image_url: "https://example.org/shoes.jpg", link_url: "/product/123", is_active: true, payment_status: "paid", placements: ["bazar_top"], start_date: "2026-11-15", end_date: "2026-12-15" };
describe("Bazar saved cards", () => {
  it("never creates placeholder slides", () => expect(visibleBazarCards([], "2026-11-15")).toEqual([]));
  it("excludes cards without a picture", () => expect(visibleBazarCards([{ ...complete, image_url: "" }], "2026-11-15")).toEqual([]));
  it("shows only complete active cards within their dates", () => {
    expect(visibleBazarCards([complete, { ...complete, is_active: false }, { ...complete, start_date: "2026-11-16" }, { ...complete, end_date: "2026-11-14" }, { ...complete, payment_status: "pending" }], "2026-11-15")).toEqual([complete]);
  });
  it("rejects an end date before its start", () => expect(cardDatesValid("2026-11-15", "2026-11-14")).toBe(false));
  it("accepts same-day publication", () => expect(cardDatesValid("2026-11-15", "2026-11-15")).toBe(true));
  it("rejects unsafe destinations", () => { expect(validCardLink("javascript:alert(1)")).toBe(false); expect(validCardLink("//example.org")).toBe(false); expect(validCardLink("/grocery/123")).toBe(true); });
  it("uses the local Karachi date", () => expect(cardDate(new Date("2026-11-14T20:00:00Z"))).toBe("2026-11-15"));
});