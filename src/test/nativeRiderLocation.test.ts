import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishNativeRiderFix, watchNativeRiderLocation } from "@/lib/nativeRiderLocation";

const mocks = vi.hoisted(() => ({ session: vi.fn(), post: vi.fn(), addWatcher: vi.fn(), removeWatcher: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android", isPluginAvailable: () => true },
  CapacitorHttp: { post: mocks.post },
  registerPlugin: () => ({ addWatcher: mocks.addWatcher, removeWatcher: mocks.removeWatcher }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.session } } }));
const fix = { lat: 28.42, lng: 70.3, accuracy: 15, at: 1000 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.invalid");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  mocks.session.mockResolvedValue({ data: { session: { access_token: "test-token" } }, error: null });
});
describe("native GPS transport", () => {
  it("sends authenticated fixes through native HTTP and returns the saved timestamp", async () => {
    mocks.post.mockResolvedValue({ status: 200, data: "2026-10-27T07:00:00Z" });
    expect(await publishNativeRiderFix(fix)).toBe("2026-10-27T07:00:00Z");
    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://test.invalid/rest/v1/rpc/publish_rider_location",
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      data: { _lat: 28.42, _lng: 70.3, _accuracy: 15 },
    }));
  });
  it("does not publish without a signed-in session", async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(publishNativeRiderFix(fix)).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("rejects unsuccessful server responses instead of showing fresh GPS", async () => {
    mocks.post.mockResolvedValue({ status: 403, data: { message: "rider unavailable" } });
    await expect(publishNativeRiderFix(fix)).rejects.toThrow();
  });
  it("uses the persistent native watcher and removes exactly that watcher", async () => {
    mocks.addWatcher.mockResolvedValue("native-watcher");
    const onFix = vi.fn();
    const stop = await watchNativeRiderLocation(onFix, vi.fn());
    expect(mocks.addWatcher).toHaveBeenCalledWith(expect.objectContaining({ stale: false, distanceFilter: 0, backgroundMessage: expect.any(String) }), expect.any(Function));
    const callback = mocks.addWatcher.mock.calls[0][1];
    callback({ latitude: 28.42, longitude: 70.3, accuracy: 15, time: 1000 });
    expect(onFix).toHaveBeenCalledWith(fix);
    await stop();
    expect(mocks.removeWatcher).toHaveBeenCalledWith({ id: "native-watcher" });
  });
});