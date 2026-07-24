import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isRestaurantOwner: boolean;
  isRider: boolean;
  isSupport: boolean;
  isMechanic: boolean;
  isServiceManager: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isRestaurantOwner: false,
  isRider: false,
  isSupport: false,
  isMechanic: false,
  isServiceManager: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isMechanic, setIsMechanic] = useState(false);
  const [isServiceManager, setIsServiceManager] = useState(false);

  const loading = !authReady || rolesLoading;

  const checkRoles = async (userId: string) => {
    try {
      const roleChecks = Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "restaurant_owner" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "rider" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "support" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "mechanic" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "service_manager" }),
      ]);
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Role check timed out")), 8000);
      });
      const [adminRes, ownerRes, riderRes, supportRes, mechanicRes, smRes] = await Promise.race([roleChecks, timeout]);
      setIsAdmin(!!adminRes.data);
      setIsRestaurantOwner(!!ownerRes.data);
      setIsRider(!!riderRes.data);
      setIsSupport(!!supportRes.data);
      setIsMechanic(!!mechanicRes.data);
      setIsServiceManager(!!smRes.data);
    } catch (error) {
      console.error("Error checking roles:", error);
      clearRoles();
    }
  };

  const clearRoles = () => {
    setIsAdmin(false);
    setIsRestaurantOwner(false);
    setIsRider(false);
    setIsSupport(false);
    setIsMechanic(false);
    setIsServiceManager(false);
  };

  const syncAuthState = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setAuthReady(true);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncAuthState(nextSession);
    });

    void supabase.auth.getSession()
      .then(({ data: { session } }) => syncAuthState(session))
      .catch((error) => {
        console.error("Error loading session:", error);
        syncAuthState(null);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      clearRoles();
      setRolesLoading(false);
      return;
    }

    let cancelled = false;
    setRolesLoading(true);
    checkRoles(user.id).finally(() => {
      if (!cancelled) setRolesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isRestaurantOwner, isRider, isSupport, isMechanic, isServiceManager, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
