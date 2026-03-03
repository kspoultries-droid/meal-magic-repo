import { UtensilsCrossed, Store, Wallet, ShoppingBag, User, Wrench } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const tabs = [
  { name: "Food", icon: UtensilsCrossed, path: "/" },
  { name: "Grocery", icon: Store, path: "/grocery" },
  { name: "Services", icon: Wrench, path: "/services" },
  { name: "Wallet", icon: Wallet, path: "/wallet" },
  { name: "Account", icon: User, path: "/profile" },
];

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();

  // Hide on dashboard/admin pages
  const hiddenPaths = ["/admin", "/restaurant-dashboard", "/rider-dashboard", "/checkout", "/auth"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  const handleTab = (tab: typeof tabs[0]) => {
    navigate(tab.path);
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.name}
              onClick={() => handleTab(tab)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors"
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                {tab.path === "/cart" && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
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
