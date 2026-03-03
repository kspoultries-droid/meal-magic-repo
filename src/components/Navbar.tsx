import { ShoppingBag, User, Search, LogOut, Shield, Store, Bike, Menu, X, Headphones } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, isAdmin, isRestaurantOwner, isRider, isSupport, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const hasRoles = isAdmin || isRestaurantOwner || isRider || isSupport;

  return (
    <nav className="sticky top-0 z-50 bg-card border-b shadow-sm pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-extrabold text-base sm:text-lg">fp</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold text-foreground hidden sm:block">
            food<span className="text-primary">panda</span>
          </span>
        </div>

        {/* Desktop role links */}
        <div className="hidden md:flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> ایڈمن
            </button>
          )}
          {isRestaurantOwner && (
            <button
              onClick={() => navigate("/restaurant-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> ریسٹورنٹ
            </button>
          )}
          {isRider && (
            <button
              onClick={() => navigate("/rider-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground hover:opacity-80 transition-colors"
            >
              <Bike className="w-3.5 h-3.5" /> رائیڈر
            </button>
          )}
          {isSupport && (
            <button
              onClick={() => navigate("/support-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-foreground hover:opacity-80 transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" /> سپورٹ
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Search">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>

          {user ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="پروفائل"
              >
                <User className="w-5 h-5 text-primary" />
              </button>

              {/* Mobile menu for roles + logout */}
              <div className="md:hidden relative">
                {hasRoles ? (
                  <>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 rounded-full hover:bg-secondary transition-colors"
                      aria-label="مینو"
                    >
                      {menuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-card border rounded-xl shadow-lg py-2 z-50">
                        {isAdmin && (
                          <button
                            onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-destructive hover:bg-secondary transition-colors"
                          >
                            <Shield className="w-4 h-4" /> ایڈمن ڈیش بورڈ
                          </button>
                        )}
                        {isRestaurantOwner && (
                          <button
                            onClick={() => { navigate("/restaurant-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-secondary transition-colors"
                          >
                            <Store className="w-4 h-4" /> ریسٹورنٹ ڈیش بورڈ
                          </button>
                        )}
                        {isRider && (
                          <button
                            onClick={() => { navigate("/rider-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-secondary transition-colors"
                          >
                            <Bike className="w-4 h-4" /> رائیڈر ڈیش بورڈ
                          </button>
                        )}
                        {isSupport && (
                          <button
                            onClick={() => { navigate("/support-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <Headphones className="w-4 h-4" /> سپورٹ ڈیش بورڈ
                          </button>
                        )}
                        <div className="border-t my-1" />
                        <button
                          onClick={async () => { await signOut(); navigate("/"); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> لاگ آؤٹ
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={async () => { await signOut(); navigate("/"); }}
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    aria-label="لاگ آؤٹ"
                  >
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Desktop logout */}
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="hidden md:flex p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="لاگ آؤٹ"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="لاگ ان / سائن اپ"
            >
              <User className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            aria-label="کارٹ"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
