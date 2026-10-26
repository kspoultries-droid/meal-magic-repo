import { act, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RiderLocationProvider, useRiderLocation } from "./RiderLocationContext";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), callback: null as null | PositionCallback, available: true, active: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "rider-test" }, isRider: true }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, not: () => query,
      maybeSingle: async () => ({ data: { is_available: mocks.available, is_suspended: false } }),
      limit: async () => ({ data: table === "orders" && mocks.active ? [{ id: "active" }] : [] }),
    }; return query;
  },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
function Status() { const state = useRiderLocation(); return <output>{state.sharing ? "saved" : state.error || "waiting"}</output>; }
const emit = () => act(() => {
  mocks.callback?.({ coords: { latitude: 28.42, longitude: 70.3, accuracy: 15 }, timestamp: Date.now() } as GeolocationPosition);
});
beforeEach(() => {
  mocks.available = true; mocks.active = false; mocks.callback = null; mocks.rpc.mockReset();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    watchPosition: vi.fn((callback: PositionCallback) => { mocks.callback = callback; return 1; }),
    getCurrentPosition: vi.fn(), clearWatch: vi.fn(),
  } });
});
afterEach(cleanup);
describe("app-level rider GPS", () => {
  it("only confirms sharing after a successful publish", async () => {
    mocks.rpc.mockResolvedValue({ data: new Date().toISOString(), error: null });
    render(<RiderLocationProvider><Status /></RiderLocationProvider>);
    await waitFor(() => expect(mocks.callback).not.toBeNull());
    expect(screen.getByRole("status").textContent).toBe("waiting");
    emit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("saved"));
    expect(mocks.rpc).toHaveBeenCalledWith("publish_rider_location", { _lat: 28.42, _lng: 70.3, _accuracy: 15 });
  });
  it("failed saves remain retryable rather than advancing the throttle", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: "offline" }, data: null }).mockResolvedValue({ error: null, data: new Date().toISOString() });
    render(<RiderLocationProvider><Status /></RiderLocationProvider>);
    await waitFor(() => expect(mocks.callback).not.toBeNull()); emit();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("status").textContent).not.toBe("waiting"));
    expect(screen.getByRole("status").textContent).not.toBe("saved");
    emit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("saved"));
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it("continues tracking an assigned delivery even when new offers are off", async () => {
    mocks.available = false; mocks.active = true;
    mocks.rpc.mockResolvedValue({ error: null, data: new Date().toISOString() });
    render(<RiderLocationProvider><Status /></RiderLocationProvider>);
    await waitFor(() => expect(mocks.callback).not.toBeNull()); emit();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
  });
  it("does not collect GPS from an idle offline rider", async () => {
    mocks.available = false;
    render(<RiderLocationProvider><Status /></RiderLocationProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});