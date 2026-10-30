import { describe, expect, it } from "vitest";
import { orderTabOf } from "./MyOrders";
describe("customer order stages",()=>{
  it("does not show an assigned rider as carrying the order",()=>expect(orderTabOf("delivering","assigned")).toBe("processing"));
  it("shows actual pickup as on the way",()=>expect(orderTabOf("ready","picked_up")).toBe("onway"));
  it("keeps delivered orders complete regardless of saved stage",()=>expect(orderTabOf("delivered","picked_up")).toBe("delivered"));
});