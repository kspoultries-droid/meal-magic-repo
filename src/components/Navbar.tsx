import { User, LogOut, Shield, Store, Bike, Menu, X, Headphones, Wrench, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Navbar = () => {
  const { user, isAdmin, isRestaurantOwner, isRider, isSupport, isMechanic, isServiceManager, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const hasRoles = isAdmin || isRestaurantOwner || isRider || isSupport || isMechanic || isServiceManager;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-hero pt-[env(safe-area-inset-top)] shadow-elegant">
      <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0 group" onClick={() => navigate("/")}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-glow">
            <span className="text-primary-foreground font-extrabold text-base sm:text-lg">EL</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold text-primary-foreground hidden sm:block tracking-tight">
            Easy<span className="text-primary-foreground/80">Life</span>
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
          {isMechanic && (
            <button
              onClick={() => navigate("/mechanic-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" /> مکینک
            </button>
          )}
          {isServiceManager && (
            <button
              onClick={() => navigate("/service-manager")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" /> سروس مینیجر
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
                aria-label="پروفائل"
              >
                <User className="w-5 h-5 text-primary-foreground" />
              </button>

              {/* Mobile menu for roles + logout */}
              <div className="md:hidden relative">
                {hasRoles ? (
                  <>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
                      aria-label="مینو"
                    >
                      {menuOpen ? <X className="w-5 h-5 text-primary-foreground" /> : <Menu className="w-5 h-5 text-primary-foreground" />}
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
                        {isMechanic && (
                          <button
                            onClick={() => { navigate("/mechanic-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-secondary transition-colors"
                          >
                            <Wrench className="w-4 h-4" /> مکینک ڈیش بورڈ
                          </button>
                        )}
                        {isServiceManager && (
                          <button
                            onClick={() => { navigate("/service-manager"); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-secondary transition-colors"
                          >
                            <ClipboardList className="w-4 h-4" /> سروس مینیجر
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
                    className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
                    aria-label="لاگ آؤٹ"
                  >
                    <LogOut className="w-5 h-5 text-primary-foreground" />
                  </button>
                )}
              </div>

              {/* Desktop logout */}
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="hidden md:flex p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
                aria-label="لاگ آؤٹ"
              >
                <LogOut className="w-5 h-5 text-primary-foreground" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
              aria-label="لاگ ان / سائن اپ"
            >
              <User className="w-5 h-5 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
