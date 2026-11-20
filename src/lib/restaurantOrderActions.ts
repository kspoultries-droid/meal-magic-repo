export type RestaurantAction = "accept" | "ready" | "complete" | "cancel";

/** Presentation combines taps, but each persisted transition still goes through server guards. */
export function restaurantTransitions(status: string, action: RestaurantAction, riderAssigned = false): string[] {
  if (["delivered", "completed", "cancelled"].includes(status)) return [];
  if (action === "accept") return status === "pending" ? ["confirmed", "preparing"] : status === "confirmed" ? ["preparing"] : [];
  if (action === "ready") return status === "confirmed" ? ["preparing", "delivering"] : status === "preparing" ? ["delivering"] : [];
  if (action === "complete") return status === "delivering" && !riderAssigned ? ["delivered"] : [];
  if (action === "cancel") return ["pending", "confirmed", "preparing"].includes(status) ? ["cancelled"] : [];
  return [];
}

export async function runRestaurantTransitions(status: string, action: RestaurantAction, riderAssigned: boolean, persist: (previous: string, next: string) => Promise<void>) {
  const transitions = restaurantTransitions(status, action, riderAssigned);
  if (!transitions.length) throw new Error("No valid restaurant action");
  let previous = status;
  for (const next of transitions) {
    await persist(previous, next);
    previous = next;
  }
  return previous;
}