const KEY = "easylife.ref";
export const SHARE_BASE = "https://easylife.apnahub.online/install";

export function captureRefFromUrl() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Za-z0-9]{4,12}$/.test(ref)) localStorage.setItem(KEY, ref.toUpperCase());
  } catch {}
}

export function getStoredRef(): string {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function shareLink(code?: string | null) {
  return code ? `${SHARE_BASE}?ref=${encodeURIComponent(code)}` : SHARE_BASE;
}
