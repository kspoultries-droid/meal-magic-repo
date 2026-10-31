import { z } from "zod";

export const WALLET_LIMITS = { min: 10, max: 100000, maxPending: 1, dailyRequests: 3, fileBytes: 5 * 1024 * 1024 } as const;
export const walletReceiptSchema = z.object({
  amount: z.coerce.number().finite().min(WALLET_LIMITS.min).max(WALLET_LIMITS.max).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, "Maximum 2 decimal places"),
  accountId: z.string().uuid(),
  reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{5,79}$/, "Transaction reference: 6-80 letters or digits"),
  paidAt: z.string().datetime({ offset: true }),
});
export function validReceiptFile(file: { type: string; size: number }) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= WALLET_LIMITS.fileBytes;
}