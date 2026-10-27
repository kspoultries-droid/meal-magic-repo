import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApkUpdateNotice } from "@/components/common/ApkUpdateNotice";

const native = vi.hoisted(() => ({ android: true, build: "100034" }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.android, getPlatform: () => native.android ? "android" : "web", isPluginAvailable: (name: string) => name === "App" } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ build: native.build }) } }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); native.android = true; native.build = "100034"; });

describe("APK update flow", () => {
  it("opens the download for an installed older APK and allows dismissal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ body: "EasyLife-Android-Build: 100035; Version: 1.0.35", assets: [{ name: "EasyLife.apk", state: "uploaded" }] }) }));
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<ApkUpdateNotice />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "اپ ڈیٹ ڈاؤن لوڈ کریں" }));
    expect(open).toHaveBeenCalledWith("https://github.com/kspoultries-droid/meal-magic-repo/releases/latest/download/EasyLife.apk", "_blank", "noopener,noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "ابھی نہیں" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    open.mockRestore();
  });
  it("does not check APK releases in the PWA", () => {
    native.android = false;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<ApkUpdateNotice />);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not offer the already installed build", async () => {
    native.build = "100035";
    const json = vi.fn().mockResolvedValue({ body: "EasyLife-Android-Build: 100035; Version: 1.0.35", assets: [{ name: "EasyLife.apk", state: "uploaded" }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json }));
    render(<ApkUpdateNotice />);
    await waitFor(() => expect(json).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});