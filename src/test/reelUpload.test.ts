import { afterEach, describe, expect, it, vi } from "vitest";
import { canRetryReelUpload, parseReelUploadError, reelUploadPath, ReelUploadError, uploadReelFile } from "@/lib/reelUpload";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("reel uploads", () => {
  it("does not retry authorization, validation or duplicate errors", () => {
    for (const status of [400, 401, 403, 409, 413, 415, 499]) {
      expect(canRetryReelUpload(new ReelUploadError(status, "rejected"))).toBe(false);
    }
    expect(canRetryReelUpload(parseReelUploadError(400, '{"statusCode":"403","message":"Access denied"}'))).toBe(false);
  });
  it("only retries transient failures", () => {
    for (const status of [0, 408, 429, 500, 503]) expect(canRetryReelUpload(new ReelUploadError(status, "temporary"))).toBe(true);
    expect(canRetryReelUpload(new Error("unknown"))).toBe(false);
  });
  it("uses unique account-scoped object paths", () => {
    const first = reelUploadPath("owner-id", "my video.mp4");
    expect(first).toMatch(/^reels\/owner-id\/[^/]+-my_video\.mp4$/);
    expect(reelUploadPath("owner-id", "my video.mp4")).not.toBe(first);
  });
  it("inserts without upsert and stops immediately on a denied response", async () => {
    const headers: Record<string, string> = {};
    const send = vi.fn(function(this: any) { this.onload(); });
    vi.stubGlobal("XMLHttpRequest", class {
      upload = {}; status = 403; responseText = '{"message":"Access denied"}';
      open() {} setRequestHeader(k: string, v: string) { headers[k] = v; }
      send = send;
    });
    const retry = vi.fn();
    await expect(uploadReelFile({ url: "/upload", token: "test", apiKey: "test", file: new File(["video"], "test.mp4"), onProgress: vi.fn(), onRetry: retry })).rejects.toMatchObject({ status: 403 });
    expect(headers["x-upsert"]).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });
});