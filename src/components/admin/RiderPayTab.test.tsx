import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RiderPayTab from "./RiderPayTab";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn().mockResolvedValue({ error: null, data: 80 }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc,
  from: (table: string) => {
    const values: Record<string, unknown[]> = {
      rider_pay_plans: [{ id: "plan", rider_id: null, city_id: null, pay_type: "hybrid", monthly_salary: 5000 }],
      riders: [{ id: "rider", wallet_balance: 0 }], profiles: [{ id: "rider", full_name: "Test rider" }], payment_accounts: [{ id: "account", label: "Office", balance: 9000, is_active: true }], rider_earnings: [],
    };
    const chain = { select: () => chain, eq: () => chain, in: () => chain, limit: () => chain, then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: values[table] || [] }).then(resolve) };
    return chain;
  },
} }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAdmin: true }) }));
afterEach(() => { cleanup(); rpc.mockClear(); });
it("submits the displayed default salary only after final confirmation", async () => {
  render(<RiderPayTab />);
  await screen.findByText("Test rider");
  fireEvent.click(screen.getByRole("button", { name: /^ادائیگی$/ }));
  fireEvent.change(screen.getByLabelText("رائیڈر ادائیگی کی وجہ"), { target: { value: "Monthly verified payment" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "account" } });
  fireEvent.click(screen.getByRole("button", { name: /ادائیگی کریں/ }));
  await screen.findByText("تصدیق اور ادائیگی");
  expect(rpc).not.toHaveBeenCalledWith("pay_rider", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "تصدیق اور ادائیگی" }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith("pay_rider", expect.objectContaining({ _rider: "rider", _salary: 5000, _from_account_id: "account", _note: "Monthly verified payment" })));
});