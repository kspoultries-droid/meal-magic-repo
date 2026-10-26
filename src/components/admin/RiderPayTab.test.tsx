import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RiderPayTab from "./RiderPayTab";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc,
  from: (table: string) => {
    const values: Record<string, unknown[]> = {
      rider_pay_plans: [{ id: "plan", rider_id: null, city_id: null, pay_type: "hybrid", monthly_salary: 5000 }],
      riders: [{ id: "rider", wallet_balance: 0 }], profiles: [{ id: "rider", full_name: "Test rider" }], payment_accounts: [], rider_earnings: [],
    };
    const chain = { select: () => chain, eq: () => chain, in: () => chain, limit: () => chain, then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: values[table] || [] }).then(resolve) };
    return chain;
  },
} }));
afterEach(() => { cleanup(); rpc.mockClear(); });
it("submits the displayed default salary only after final confirmation", async () => {
  render(<RiderPayTab />);
  await screen.findByText("Test rider");
  fireEvent.click(screen.getByRole("button", { name: /^ادائیگی$/ }));
  fireEvent.click(screen.getByRole("button", { name: /ادائیگی کریں/ }));
  expect(rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "تصدیق اور ادائیگی" }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith("pay_rider", expect.objectContaining({ _rider: "rider", _salary: 5000 })));
});