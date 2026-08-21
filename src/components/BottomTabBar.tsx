import { UtensilsCrossed, Store, ShoppingBag, User, Wrench, Package } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCityServices } from "@/hooks/useCityServices";

const tabs = [
  { name: "Food", icon: UtensilsCrossed, path: "/" },
  { name: "Grocery", icon: Store, path: "/grocery" },
  { name: "Bazar", icon: Package, path: "/wholesale" },
  { name: "Services", icon: Wrench, path: "/services" },
  { name: "Cart", icon: ShoppingBag, path: "cart" },
  { name: "Account", icon: User, path: "/profile" },
];

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();
  const { foodLive, groceryLive, wholesaleLive } = useCityServices();

  // Hide on dashboard/admin pages
  const hiddenPaths = ["/admin", "/restaurant-dashboard", "/rider-dashboard", "/mechanic-dashboard", "/service-manager", "/checkout", "/auth"];
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 pb-[env(safe-area-inset-bottom)] shadow-card">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
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
            <button
              key={tab.name}
              onClick={() => handleTab(tab)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all active:scale-95"
            >
              {active && (
                <span className="absolute top-1 w-10 h-1 rounded-full bg-gradient-primary shadow-glow" />
              )}
              <div className={`relative transition-all duration-300 ${active ? "scale-110 -translate-y-0.5" : ""}`}>
                <Icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.5 : 2} />
                {tab.path === "cart" && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-gradient-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-glow animate-scale-in">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
