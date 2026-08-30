import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, ChevronLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

// Routes where a floating cart would get in the way
const HIDDEN_PREFIXES = [
  "/checkout",
  "/auth",
  "/order-confirmation",
  "/order-tracking",
  "/admin",
  "/operations",
  "/partner",
  "/wallet",
  "/install",
  "/rider-dashboard",
  "/restaurant-dashboard",
  "/support-dashboard",
  "/mechanic-dashboard",
  "/service-manager",
];

// Routes that render the BottomTabBar — cart bar must sit above it
const TABBAR_PREFIXES = ["/", "/grocery", "/wholesale", "/services", "/search", "/profile"];

const FloatingCartBar = () => {
  const { items, totalItems, totalPrice, setIsOpen } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (totalItems === 0) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const hasTabBar =
    pathname === "/" ||
    TABBAR_PREFIXES.some((p) => p !== "/" && pathname === p) ||
    pathname.startsWith("/grocery/") ||
    pathname.startsWith("/bazar/");

  const shopName = items[0]?.restaurant || "";

  return (
    <div
      className="fixed left-0 right-0 z-40 px-3 animate-slide-up pointer-events-none"
      style={{
        bottom: hasTabBar
          ? "calc(4.25rem + env(safe-area-inset-bottom))"
          : "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-auto mx-auto max-w-md flex items-center gap-2 rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant ring-1 ring-white/15 p-2 pl-3">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-label="کارٹ کھولیں"
        >
          <div className="relative w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-background text-foreground text-[11px] font-extrabold flex items-center justify-center shadow-card">
              {totalItems}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] opacity-90 truncate">{shopName || "آپ کا آرڈر"}</p>
            <p className="text-sm font-extrabold leading-tight">Rs. {totalPrice}</p>
          </div>
        </button>
        <button
          onClick={() => navigate("/checkout")}
          className="shrink-0 h-10 px-4 rounded-xl bg-background/95 text-foreground text-sm font-extrabold flex items-center gap-1 hover:scale-[1.03] active:scale-95 transition-transform"
        >
          چیک آؤٹ
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FloatingCartBar;
