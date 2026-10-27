import { describe, expect, it } from "vitest";
import { hasApkUpdate, parseApkRelease } from "@/lib/apkUpdate";

const published = (build: number) => ({ body: `EasyLife-Android-Build: ${build}; Version: 1.0.${build}`, assets: [{ name: "EasyLife.apk", state: "uploaded" }] });

describe("APK update eligibility", () => {
  it("notifies legacy APK users about a newer Android build", () => {
    expect(hasApkUpdate(1, parseApkRelease(published(100035)))).toBe(true);
  });
  it("does not notify users already running that build", () => {
    expect(hasApkUpdate(100035, parseApkRelease(published(100035)))).toBe(false);
  });
  it("never offers a downgrade", () => {
    expect(hasApkUpdate(100036, parseApkRelease(published(100035)))).toBe(false);
  });
  it("ignores the legacy release body without real version metadata", () => {
    expect(parseApkRelease({ ...published(35), body: "Easy Life Android app" })).toBeNull();
  });
  it("ignores unpublished or missing APK assets", () => {
    expect(parseApkRelease({ ...published(35), draft: true })).toBeNull();
    expect(parseApkRelease({ ...published(35), prerelease: true })).toBeNull();
    expect(parseApkRelease({ ...published(35), assets: [] })).toBeNull();
  });
  it("does not infer updates from an invalid installed code", () => {
    expect(hasApkUpdate(NaN, parseApkRelease(published(35)))).toBe(false);
  });
});