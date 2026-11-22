import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNewOrderAlert } from "./useNewOrderAlert";

afterEach(() => vi.useRealTimers());
describe("persistent kitchen alerts", () => {
  it("keeps a pending order visible beyond 15 seconds and stops on acceptance", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useNewOrderAlert({ persistent: true }));
    act(() => result.current.syncPendingOrders(["pending-order"]));
    act(() => vi.advanceTimersByTime(45000));
    expect(result.current.newOrderCount).toBe(1);
    act(() => result.current.syncPendingOrders([]));
    expect(result.current.newOrderCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });
  it("deduplicates refreshes, allows acknowledgement and alerts on a new order", () => {
    const { result } = renderHook(() => useNewOrderAlert({ persistent: true }));
    act(() => result.current.syncPendingOrders(["a", "b"]));
    act(() => result.current.syncPendingOrders(["a", "b"]));
    expect(result.current.newOrderCount).toBe(2);
    act(() => result.current.dismissAlert());
    act(() => result.current.syncPendingOrders(["a", "b"]));
    expect(result.current.newOrderCount).toBe(0);
    act(() => result.current.syncPendingOrders(["b", "c"]));
    expect(result.current.newOrderCount).toBe(2);
  });
  it("preserves the default 3-ring/15-second behavior for other dashboards", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNewOrderAlert());
    act(() => result.current.triggerAlert());
    expect(result.current.newOrderCount).toBe(1);
    act(() => vi.advanceTimersByTime(15000));
    expect(result.current.newOrderCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});