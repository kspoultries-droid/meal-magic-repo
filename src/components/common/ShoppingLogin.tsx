import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { SHOPPING_LOGIN_EVENT, pendingShopping, rememberShopping, clearPendingShopping } from "@/lib/shoppingAccess";

export default function ShoppingLogin() {
  const { user, loading } = useAuth();
  const { addItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const request = () => navigate("/auth");
    window.addEventListener(SHOPPING_LOGIN_EVENT, request);
    return () => window.removeEventListener(SHOPPING_LOGIN_EVENT, request);
  }, [navigate]);
  useEffect(() => {
    if (!user || loading) return;
    const pending = pendingShopping();
    if (!pending) return;
    clearPendingShopping();
    if (pending.items.length) addItems(pending.items.map(item => ({ ...item, quantity: item.quantity ?? 1 })));
    navigate(pending.path, { replace: true });
  }, [user?.id, loading, addItems, navigate]);
  const shoppingPage = /^\/(grocery|bazar|wholesale|restaurant|product|category|search|services|store)(\/|$)/.test(location.pathname) || location.pathname === "/";
  if (user || loading || !shoppingPage) return null;
  return <div className="sticky top-[var(--navbar-height)] z-30 border-b border-border bg-background"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5"><span className="text-xs text-muted-foreground">{tr("Sign in for your orders", "اپنے آرڈرز کے لیے لاگ ان کریں")}</span><Button size="sm" variant="ghost" className="h-7 shrink-0 text-primary" onClick={() => { rememberShopping(); navigate("/auth"); }}><LogIn className="me-1.5 size-3.5" />{tr("Sign in", "لاگ ان")}</Button></div></div>;
}