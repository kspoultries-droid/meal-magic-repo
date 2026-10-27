import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getSavedMode, startPath } from "@/lib/appMode";

/** On app open at "/", approved riders/restaurants land on their dashboard once per launch. */
export function RoleStartRedirect() {
  const { user, loading, isRider, isRestaurantOwner } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || loading) return;
    if (!user) return;
    done.current = true;
    if (location.pathname !== "/") return;
    const target = startPath(getSavedMode(), { isRider, isRestaurantOwner });
    if (target) navigate(target, { replace: true });
  }, [loading, user, isRider, isRestaurantOwner, location.pathname, navigate]);

  return null;
}
