import { afterEach, describe, expect, it, vi } from "vitest";
import { printOrderReceipt, RECEIPT_PREVIEW_EVENT } from "./receiptPrint";

afterEach(() => vi.restoreAllMocks());
describe("Receipt preview handoff", () => {
  it.each(["kitchen", "bill"] as const)("dispatches %s without opening a browser window", kind => {
    const open = vi.spyOn(window, "open");
    const listener = vi.fn();
    window.addEventListener(RECEIPT_PREVIEW_EVENT, listener, { once: true });
    expect(printOrderReceipt({ id: "9800c2", order_items: [] }, kind)).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail.kind).toBe(kind);
  });
});