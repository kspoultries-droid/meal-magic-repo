import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveNativePushToken } from "@/lib/nativePush";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "android", isNativePlatform: () => true } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
beforeEach(() => mocks.rpc.mockReset());
describe("native device registration", () => {
  it("uses the authenticated registration RPC for Android tokens", async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await saveNativePushToken("test-device-registration-token");
    expect(mocks.rpc).toHaveBeenCalledWith("register_device_token", { _token: "test-device-registration-token", _platform: "android" });
  });
  it("does not report registration success after a rejected save", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "rejected" } });
    await expect(saveNativePushToken("test-device-registration-token")).rejects.toThrow();
  });
});