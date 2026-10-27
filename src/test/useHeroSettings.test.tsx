import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { bazarHeroDefaults, servicesHeroDefaults } from "@/lib/heroConfig";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }) },
}));

describe("editable header settings readiness", () => {
  beforeEach(() => read.mockReset());

  it.each([
    ["hero_bazar", bazarHeroDefaults],
    ["hero_services", servicesHeroDefaults],
  ] as const)("waits for saved settings on each visit to %s", async (key, defaults) => {
    for (let visit = 0; visit < 4; visit++) {
      let finish: ((value: unknown) => void) | undefined;
      read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      const { result, unmount } = renderHook(() => useHeroSettings(key, defaults));
      expect(result.current.loaded).toBe(false);
      await act(async () => {
        finish?.({ data: { value: JSON.stringify({ bgFrom: "#123456", bgTo: "#654321" }) }, error: null });
      });
      expect(result.current.loaded).toBe(true);
      expect(result.current.config.bgFrom).toBe("#123456");
      expect(result.current.config.bgTo).toBe("#654321");
      unmount();
    }
  });

  it("exits the loading state when the settings read fails", async () => {
    read.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useHeroSettings("hero_bazar", bazarHeroDefaults));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.config).toEqual(bazarHeroDefaults);
  });
});