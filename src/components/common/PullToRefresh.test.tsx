import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "./PullToRefresh";

function touch(type: string, y: number, target: EventTarget = document.body) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: type === "touchend" || type === "touchcancel" ? [] : [{ clientX: 100, clientY: y }] });
  act(() => { target.dispatchEvent(event); });
}

describe("mobile pull to refresh", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal("scrollY", 0);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  function setup(path = "/") {
    const refresh = vi.fn();
    render(<MemoryRouter initialEntries={[path]}><PullToRefresh onRefresh={refresh} /></MemoryRouter>);
    return refresh;
  }
  it("refreshes once after a deliberate downward pull", () => {
    const refresh = setup(); touch("touchstart", 100); touch("touchmove", 280); touch("touchend", 280); touch("touchend", 280);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("does not refresh on a short pull", () => {
    const refresh = setup(); touch("touchstart", 100); touch("touchmove", 130); touch("touchend", 130);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not refresh when the page is already scrolled", () => {
    const refresh = setup(); vi.stubGlobal("scrollY", 300); touch("touchstart", 100); touch("touchmove", 280); touch("touchend", 280);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not interfere with reel swipes", () => {
    const refresh = setup("/reels"); touch("touchstart", 100); touch("touchmove", 280); touch("touchend", 280);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not refresh a cancelled gesture", () => {
    const refresh = setup(); touch("touchstart", 100); touch("touchmove", 280); touch("touchcancel", 280); touch("touchend", 280);
    expect(refresh).not.toHaveBeenCalled();
  });
});