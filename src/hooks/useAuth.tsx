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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isRestaurantOwner: false,
  isRider: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [isRider, setIsRider] = useState(false);

  const checkRoles = async (userId: string) => {
    try {
      const [adminRes, ownerRes, riderRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "restaurant_owner" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "rider" }),
      ]);
      setIsAdmin(!!adminRes.data);
      setIsRestaurantOwner(!!ownerRes.data);
      setIsRider(!!riderRes.data);
    } catch (error) {
      console.error("Error checking roles:", error);
      clearRoles();
    }
  };

  const clearRoles = () => {
    setIsAdmin(false);
    setIsRestaurantOwner(false);
    setIsRider(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      } else {
        clearRoles();
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isRestaurantOwner, isRider, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
