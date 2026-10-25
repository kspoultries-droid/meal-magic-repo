import { UtensilsCrossed, Store, ShoppingBag, User, Wrench, Package, Clapperboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCityServices } from "@/hooks/useCityServices";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";

const tabs: { name: string; key: TranslationKey; icon: any; path: string }[] = [
  { name: "Food", key: "tab.food", icon: UtensilsCrossed, path: "/" },
  { name: "Grocery", key: "tab.grocery", icon: Store, path: "/grocery" },
  { name: "Bazar", key: "tab.bazar", icon: Package, path: "/wholesale" },
  { name: "Reels", key: "tab.reels", icon: Clapperboard, path: "/reels" },
  { name: "Services", key: "tab.services", icon: Wrench, path: "/services" },
  { name: "Cart", key: "tab.cart", icon: ShoppingBag, path: "cart" },
  { name: "Account", key: "tab.account", icon: User, path: "/profile" },
];

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();
  const { t } = useLanguage();
  const { foodLive, groceryLive, wholesaleLive } = useCityServices();

  // Hide on dashboard/admin pages
  const hiddenPaths = ["/admin", "/restaurant-dashboard", "/rider-dashboard", "/mechanic-dashboard", "/service-manager", "/checkout", "/auth", "/reels"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  const handleTab = (tab: typeof tabs[0]) => {
    if (tab.path === "cart") {
      setIsOpen(true);
      return;
    }
    navigate(tab.path);
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] shadow-soft">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs
          .filter((tab) =>
            tab.path === "/" ? foodLive :
            tab.path === "/grocery" ? groceryLive :
            tab.path === "/wholesale" ? wholesaleLive : true
          )
          .map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Button variant="ghost"
              key={tab.name}
              onClick={() => handleTab(tab)}
              aria-current={active ? "page" : undefined}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-none px-0 pb-1 pt-3 hover:bg-accent/50 active:scale-95"
            >
              {active && (
                <span className="absolute top-1 w-7 h-0.5 rounded-full bg-primary" />
              )}
              <div className="relative h-5 w-5">
                <Icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.5 : 2} />
                {tab.path === "cart" && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-gradient-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-glow animate-scale-in">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className={`w-full truncate text-center text-[10px] font-semibold leading-4 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {t(tab.key, tab.name)}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
