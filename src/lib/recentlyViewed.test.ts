import { beforeEach, describe, expect, it } from "vitest";
import { readRecent, recordRecent } from "./recentlyViewed";
describe("recent product history", () => {
  beforeEach(() => localStorage.clear());
  it("keeps only the latest visit for an item", () => {
    recordRecent({id:"a",name:"Rice",price:100,image_url:null},"one");
    recordRecent({id:"a",name:"Rice",price:120,image_url:null},"one");
    expect(readRecent("one")).toHaveLength(1);
    expect(readRecent("one")[0].price).toBe(120);
  });
  it("does not show one account's browsing in another", () => {
    recordRecent({id:"a",name:"Rice",price:100,image_url:null},"one");
    expect(readRecent("two")).toEqual([]);
  });
});