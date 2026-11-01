import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getSavedMode, startPath } from "@/lib/appMode";

/** On app open at "/", approved riders/restaurants land on their dashboard once per launch. */
export function RoleStartRedirect() {
  const { user, loading, isRider, isRestaurantOwner, isServiceManager, isStaff, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || loading) return;
    if (!user) return;
    done.current = true;
    if (location.pathname !== "/") return;
    const saved = getSavedMode();
    const target = saved === "customer" || isAdmin ? null : isStaff ? "/admin" : isServiceManager ? "/service-manager-dashboard" : startPath(saved, { isRider, isRestaurantOwner });
    if (target) navigate(target, { replace: true });
  }, [loading, user, isRider, isRestaurantOwner, isServiceManager, isStaff, isAdmin, location.pathname, navigate]);

  return null;
}
