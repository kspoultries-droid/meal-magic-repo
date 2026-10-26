import { User, LogOut, Shield, Store, Bike, Menu, X, Headphones, Wrench, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LocationPill from "@/components/location/LocationPill";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import NotificationBell from "@/components/common/NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { user, isAdmin, isRestaurantOwner, isRider, isSupport, isMechanic, isServiceManager, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const hasRoles = isStaff || isAdmin || isRestaurantOwner || isRider || isSupport || isMechanic || isServiceManager;

  return (
    <nav aria-label="Easy Life" className="app-navbar sticky top-0 z-50 isolate pt-[env(safe-area-inset-top)] shadow-soft">
      <div className="container mx-auto flex min-h-14 min-w-0 items-center justify-between gap-1 px-3 sm:min-h-16 sm:px-4">
        {/* Logo */}
        <Button variant="ghost" aria-label="Easy Life" className="group h-auto shrink-0 gap-2 p-0 text-primary-foreground hover:text-primary-foreground hover:bg-transparent" onClick={() => navigate("/")}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/15 flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-primary-foreground font-extrabold text-base sm:text-lg">EL</span>
          </div>
          <span className="hidden text-lg sm:inline sm:text-xl font-extrabold text-primary-foreground">
            Easy<span className="text-primary-foreground/80">Life</span>
          </span>
        </Button>

        <LocationPill className="mx-2 flex-1 justify-center sm:flex-none" />

        {/* Desktop role links */}
        <div className="hidden md:flex items-center gap-2">
          {(isAdmin || isStaff) && (
            <Button variant="ghost"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> {t("role.admin")}
            </Button>
          )}
          {isRestaurantOwner && (
            <Button variant="ghost"
              onClick={() => navigate("/restaurant-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> {t("role.restaurant")}
            </Button>
          )}
          {isRider && (
            <Button variant="ghost"
              onClick={() => navigate("/rider-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <Bike className="w-3.5 h-3.5" /> {t("role.rider")}
            </Button>
          )}
          {isSupport && (
            <Button variant="ghost"
              onClick={() => navigate("/support-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" /> {t("role.support")}
            </Button>
          )}
          {isMechanic && (
            <Button variant="ghost"
              onClick={() => navigate("/mechanic-dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" /> {t("role.mechanic")}
            </Button>
          )}
          {isServiceManager && (
            <Button variant="ghost"
              onClick={() => navigate("/service-manager")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" /> {t("role.serviceManager")}
            </Button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher tone="light" />
          {user && <NotificationBell />}
          {user ? (
            <>

              {/* Mobile menu for roles + logout */}
              <div className="md:hidden relative">
                {hasRoles ? (
                  <>
                    <Button variant="ghost"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="h-10 w-10 p-2 rounded-lg text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                      aria-label="مینو"
                    >
                      {menuOpen ? <X className="w-5 h-5 text-primary-foreground" /> : <Menu className="w-5 h-5 text-primary-foreground" />}
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-card border rounded-lg shadow-elegant py-2 z-50">
                        {(isAdmin || isStaff) && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-destructive hover:bg-secondary transition-colors"
                          >
                            <Shield className="w-4 h-4" /> ایڈمن ڈیش بورڈ
                          </Button>
                        )}
                        {isRestaurantOwner && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/restaurant-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-secondary transition-colors"
                          >
                            <Store className="w-4 h-4" /> ریسٹورنٹ ڈیش بورڈ
                          </Button>
                        )}
                        {isRider && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/rider-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-secondary transition-colors"
                          >
                            <Bike className="w-4 h-4" /> رائیڈر ڈیش بورڈ
                          </Button>
                        )}
                        {isSupport && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/support-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <Headphones className="w-4 h-4" /> سپورٹ ڈیش بورڈ
                          </Button>
                        )}
                        {isMechanic && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/mechanic-dashboard"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-secondary transition-colors"
                          >
                            <Wrench className="w-4 h-4" /> مکینک ڈیش بورڈ
                          </Button>
                        )}
                        {isServiceManager && (
                          <Button variant="ghost"
                            onClick={() => { navigate("/service-manager"); setMenuOpen(false); }}
                            className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-secondary transition-colors"
                          >
                            <ClipboardList className="w-4 h-4" /> {t("role.serviceManager")}
                          </Button>
                        )}
                        <div className="border-t my-1" />
                        <Button variant="ghost"
                          onClick={async () => { await signOut(); navigate("/"); setMenuOpen(false); }}
                          className="flex items-center gap-2 h-auto justify-start whitespace-normal w-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> لاگ آؤٹ
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Button variant="ghost"
                    onClick={async () => { await signOut(); navigate("/"); }}
                    className="h-10 w-10 p-2 rounded-lg text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                    aria-label="لاگ آؤٹ"
                  >
                    <LogOut className="w-5 h-5 text-primary-foreground" />
                  </Button>
                )}
              </div>

              {/* Desktop logout */}
              <Button variant="ghost"
                onClick={async () => { await signOut(); navigate("/"); }}
                className="hidden md:flex h-10 w-10 p-2 rounded-lg text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                aria-label="لاگ آؤٹ"
              >
                <LogOut className="w-5 h-5 text-primary-foreground" />
              </Button>
            </>
          ) : (
            <Button variant="ghost"
              onClick={() => navigate("/auth")}
              className="h-10 w-10 p-2 rounded-lg text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
              aria-label="لاگ ان / سائن اپ"
            >
              <User className="w-5 h-5 text-primary-foreground" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
