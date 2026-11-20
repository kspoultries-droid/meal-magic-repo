import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => {
  const q: any = { select: () => q, eq: () => q, order: async () => ({ data: [] }) };
  const ch: any = { on: () => ch, subscribe: () => ch };
  return { supabase: { from: () => q, channel: () => ch, removeChannel: () => {} } };
});

import CourierTimeline from "./CourierTimeline";

describe("CourierTimeline", () => {
  it("shows booking pending honestly when no courier is booked", () => {
    render(<CourierTimeline orderId="o1" />);
    expect(screen.getByText(/Courier booking pending|کوریئر بکنگ ابھی باقی ہے/)).toBeTruthy();
    expect(screen.queryByText(/^(Track|ٹریک کریں)$/)).toBeNull();
  });
  it("shows tracking number and track link once booked", () => {
    render(<CourierTimeline orderId="o1" courierName="TCS" trackingNumber="CN123" trackingUrl="https://example.com" shipmentStatus="in_transit" />);
    expect(screen.getByText(/#CN123/)).toBeTruthy();
    expect(screen.getByText(/^(Track|ٹریک کریں)$/)).toBeTruthy();
  });
});
