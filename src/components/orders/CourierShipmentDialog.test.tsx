import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setTrLang } from "@/lib/i18n/tr";
import CourierShipmentDialog from "./CourierShipmentDialog";

const { update, eq, success } = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), success: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update }) } }));
vi.mock("sonner", () => ({ toast: { success, error: vi.fn() } }));

const order = { id: "test-order", delivery_method: "courier", courier_name: "Receipt carrier", tracking_number: "ACTUAL-CN" };
const renderDialog = (overrides = {}, onSaved = vi.fn()) => {
  render(<CourierShipmentDialog open order={{ ...order, ...overrides }} onOpenChange={vi.fn()} onSaved={onSaved} />);
  return onSaved;
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save courier record" }));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  setTrLang("en");
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});

describe("manual courier record preserves existing financial and delivery snapshots", () => {
  it("does not assume dispatch when saving a first receipt", async () => {
    renderDialog(); submit();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].shipment_status).toBe("pending");
  });
  it("updates evidence only, never delivery mode or financial amounts", async () => {
    const saved = renderDialog(); submit();
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith({ courier_name: "Receipt carrier", tracking_number: "ACTUAL-CN", courier_tracking_url: null, courier_payment_type: "cod", shipment_status: "pending" });
    expect(eq).toHaveBeenCalledWith("id", "test-order");
  });
  it("cannot convert a local rider order to courier", () => {
    renderDialog({ delivery_method: "local_rider" }); submit();
    expect(update).not.toHaveBeenCalled();
  });
  it("requires receipt carrier and actual CN before any write", () => {
    renderDialog({ courier_name: "", tracking_number: "" }); submit();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Actual courier company"), { target: { value: "Receipt carrier" } });
    submit(); expect(update).not.toHaveBeenCalled();
  });
  it("does not report saved or notify success when server authorization rejects the write", async () => {
    eq.mockResolvedValue({ error: { message: "Permission denied" } });
    const saved = renderDialog(); submit();
    await waitFor(() => expect(eq).toHaveBeenCalledOnce());
    expect(saved).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });
});