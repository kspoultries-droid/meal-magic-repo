/** UI availability only. The server independently authorizes every read/action. */
export function staffWorkspace(permissions: readonly string[], isAdmin = false) {
  const can = (permission: string) => isAdmin || permissions.includes(permission);
  return {
    operations: [can("orders") && "orders", can("dispatch") && "grocery-dispatch", (can("dispatch") || can("finance")) && "rider-supervision", can("orders") && "photo-orders", can("audit") && "audit", can("support") && "support"].filter(Boolean) as string[],
    partners: [can("partners") && "applications", can("partners") && "restaurants", can("riders") && "riders", can("partners") && "grocery", isAdmin && "services", isAdmin && "wholesale-cats"].filter(Boolean) as string[],
    finance: can("finance") ? ["revenue", ...(isAdmin ? ["banks", "wallet-topups"] : []), "payouts", "rider-remit", "rider-pay", ...(isAdmin ? ["rates"] : [])] : [],
    team: [can("team") && "team", (can("support") || can("finance") || can("approve")) && "approvals", (can("audit") || can("team")) && "activity"].filter(Boolean) as string[],
  };
}

export function staffLanding(permissions: readonly string[], isAdmin: boolean) {
  if (isAdmin) return { section: "overview", sub: "" };
  if (permissions.length > 0) return { section: "work", sub: "" };
  const areas = staffWorkspace(permissions);
  for (const section of ["operations", "partners", "finance", "team"] as const) {
    const sub = areas[section][0];
    if (sub) return { section, sub };
  }
  return { section: "", sub: "" };
}

export function approvalKinds(permissions: readonly string[]) {
  return [permissions.includes("support") && "refund", permissions.includes("finance") && "payout", permissions.includes("finance") && "other"].filter(Boolean) as string[];
}