import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import SwipeConfirm from "./SwipeConfirm";

afterEach(cleanup);
beforeAll(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));
afterAll(() => vi.unstubAllGlobals());
describe("deliberate delivery confirmation", () => {
  it("does not submit on Enter at the initial position", () => {
    const confirm = vi.fn();
    render(<SwipeConfirm label="Pickup" onConfirm={confirm} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    expect(confirm).not.toHaveBeenCalled();
  });
  it("requires reaching the end and explicit keyboard confirmation", async () => {
    const confirm = vi.fn();
    render(<SwipeConfirm label="Pickup" onConfirm={confirm} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  });
  it("blocks duplicate submissions while an action is pending", async () => {
    let finish: (() => void) | undefined;
    const confirm = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<SwipeConfirm label="Complete" onConfirm={confirm} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    expect(confirm).toHaveBeenCalledTimes(1);
    finish?.();
    await waitFor(() => expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "0"));
  });
  it("never confirms when cash or another prerequisite disables the control", () => {
    const confirm = vi.fn();
    render(<SwipeConfirm label="Complete" disabled onConfirm={confirm} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    expect(confirm).not.toHaveBeenCalled();
  });
});