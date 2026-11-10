import type { AddItemInput } from "@/contexts/CartContext";

export const SHOPPING_LOGIN_EVENT = "easylife:shopping-login";
const KEY = "easylife:pending-shopping";
const MAX_AGE = 30 * 60 * 1000;
export function safeShoppingPath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !path.startsWith("/auth") ? path : "/";
}
export function rememberShopping(items: AddItemInput[] = []) {
  sessionStorage.setItem(KEY, JSON.stringify({ items, path: safeShoppingPath(window.location.pathname + window.location.search), at: Date.now() }));
}
export function pendingShopping(): { items: AddItemInput[]; path: string } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!raw || !Array.isArray(raw.items) || typeof raw.path !== "string" || !Number.isFinite(raw.at) || Date.now() - raw.at > MAX_AGE) return null;
    return { items: raw.items, path: safeShoppingPath(raw.path) };
  } catch { return null; }
}
export function clearPendingShopping() { sessionStorage.removeItem(KEY); }
