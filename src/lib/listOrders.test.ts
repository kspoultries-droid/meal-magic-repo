import { describe, expect, it } from "vitest";
import { MAX_LIST_PHOTOS, listPhotos, canAcceptListQuote, validListPin, printerPaperWidth } from "./listOrders";
describe("ration list rules", () => {
  it("allows up to 4 photos", () => expect(MAX_LIST_PHOTOS).toBe(4));
  it("retains legacy single photos", () => expect(listPhotos({ image_url: "old" })).toEqual(["old"]));
  it("keeps all selected photos", () => expect(listPhotos({image_url:"old",image_urls:["1","2","3","4"]})).toEqual(["1","2","3","4"]));
  it("does not accept slip-only quotes as money owed", () => expect(canAcceptListQuote({status:"quoted", total_amount:0})).toBe(false));
  it("accepts a final priced quote only in quoted state", () => { expect(canAcceptListQuote({status:"quoted",total_amount:300})).toBe(true); expect(canAcceptListQuote({status:"pending",total_amount:300})).toBe(false); });
  it("rejects missing delivery coordinates", () => {expect(validListPin(null,70)).toBe(false);expect(validListPin(28,181)).toBe(false);expect(validListPin(28.42,70.3)).toBe(true);});
  it("uses 80mm for both thermal printer connections", () => {expect(printerPaperWidth("usb80")).toBe("80mm");expect(printerPaperWidth("bluetooth80")).toBe("80mm");expect(printerPaperWidth("a4")).toBe("210mm");});
});