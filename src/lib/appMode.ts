export type AppMode = "customer" | "rider" | "restaurant";

const KEY = "easylife.appMode";

export const MODE_PATHS: Record<Exclude<AppMode, "customer">, string> = {
  rider: "/rider-dashboard",
  restaurant: "/restaurant-dashboard",
};

export function getSavedMode(): AppMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "customer" || v === "rider" || v === "restaurant" ? v : null;
  } catch {
    return null;
  }
}

export function saveMode(mode: AppMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
}

/** Where to land on app open from the home page; null = stay on home. */
export function startPath(
  saved: AppMode | null,
  roles: { isRider: boolean; isRestaurantOwner: boolean },
): string | null {
  if (saved === "customer") return null;
  if (saved === "rider" && roles.isRider) return MODE_PATHS.rider;
  if (saved === "restaurant" && roles.isRestaurantOwner) return MODE_PATHS.restaurant;
  if (saved === null) {
    if (roles.isRider && !roles.isRestaurantOwner) return MODE_PATHS.rider;
    if (roles.isRestaurantOwner && !roles.isRider) return MODE_PATHS.restaurant;
  }
  return null;
}
