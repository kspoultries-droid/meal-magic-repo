import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdsTab from "./AdsTab";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn(), verify: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }), insert: mocks.insert }),
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: "https://example.com/ad.webp" } }) }) },
} }));
vi.mock("@/lib/i18n/tr", () => ({ tr: (en: string) => en }));
vi.mock("@/components/PromotionalAds", () => ({ AdSlide: () => null }));
vi.mock("@/components/admin/AdProductPicker", () => ({ default: () => null }));
vi.mock("@/lib/adCreative", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/adCreative")>(),
  prepareAdImage: async (file: File) => file,
  verifyAdImage: mocks.verify,
}));

beforeEach(() => { vi.clearAllMocks(); mocks.insert.mockResolvedValue({ error: null }); mocks.verify.mockResolvedValue(undefined); });
afterEach(cleanup);

async function startAd() {
  render(<AdsTab />);
  await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "New Ad" }));
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Test business" } });
  fireEvent.change(screen.getByLabelText("Title", { exact: true }), { target: { value: "Test offer" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("ad save protection", () => {
  it("requires an image before allowing a save", async () => {
    await startAd();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert").textContent).toContain("An image is required");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps the draft and never inserts the ad after a failed upload", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Upload denied" } });
    await startAd();
    fireEvent.change(screen.getByLabelText("Image · 2:1"), { target: { files: [new File(["test"], "ad.webp", { type: "image/webp" })] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Save ad" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Upload denied"));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("blocks an unreadable image URL rather than reporting a successful save", async () => {
    mocks.verify.mockRejectedValue(new Error("Image could not be loaded"));
    await startAd();
    fireEvent.change(screen.getByLabelText("Image URL"), { target: { value: "https://example.com/missing.png" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Save ad" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Image could not be loaded"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});