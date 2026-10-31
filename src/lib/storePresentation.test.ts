import { describe, expect, it } from "vitest";
import { storePath, mergeProductPhotos } from "./storePresentation";
describe("shop presentation", () => {
  it("opens Bazar shops in Bazar and retail shops in grocery", () => {
    expect(storePath("qayyom", "wholesale")).toBe("/bazar/qayyom");
    expect(storePath("retail", "retail")).toBe("/grocery/retail");
  });
  it("uses an uploaded replacement as the cover while preserving previous photos", () => {
    expect(mergeProductPhotos({image_url:"old",images:["old","gallery"]},["new"])).toEqual({image_url:"new",images:["new","old","gallery"]});
    expect(mergeProductPhotos({image_url:null,images:[]},["single"])).toEqual({image_url:"single",images:["single"]});
  });
});