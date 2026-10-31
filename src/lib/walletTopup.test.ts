import { describe, expect, it } from "vitest";
import { WALLET_LIMITS, walletReceiptSchema, validReceiptFile } from "./walletTopup";
const base = { amount: 5000, accountId: "aaaaaaaa-0033-4000-8000-000000000003", reference: "TX123456", paidAt: "2026-10-31T01:00:00Z" };
describe("wallet receipt rules", () => {
  it("keeps existing 10-100000 amount range", () => {
    expect(walletReceiptSchema.safeParse({...base,amount:9}).success).toBe(false);
    expect(walletReceiptSchema.safeParse({...base,amount:100001}).success).toBe(false);
    expect(walletReceiptSchema.safeParse({...base,amount:10}).success).toBe(true);
    expect(walletReceiptSchema.safeParse({...base,amount:100000}).success).toBe(true);
  });
  it("requires real deposit account and reference with receipt", () => {
    expect(walletReceiptSchema.safeParse({...base,reference:""}).success).toBe(false);
    expect(walletReceiptSchema.safeParse({...base,accountId:""}).success).toBe(false);
    expect(validReceiptFile({type:"image/png",size:0})).toBe(false);
  });
  it("only accepts images up to 5 MB", () => {
    expect(validReceiptFile({type:"image/png",size:5*1024*1024})).toBe(true);
    expect(validReceiptFile({type:"image/png",size:5*1024*1024+1})).toBe(false);
    expect(validReceiptFile({type:"text/html",size:100})).toBe(false);
  });
  it("caps requests at one pending and three daily", () => {
    expect(WALLET_LIMITS.maxPending).toBe(1);
    expect(WALLET_LIMITS.dailyRequests).toBe(3);
  });
});