import { User, LogOut, Shield, Store, Bike, Menu, X, Headphones, Wrench, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LocationPill from "@/components/location/LocationPill";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import NotificationBell from "@/components/common/NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { saveMode, type AppMode } from "@/lib/appMode";

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
                    {menuOpen && (() => {
                      const go = (path: string, mode?: AppMode) => {
                        if (mode) saveMode(mode);
                        navigate(path);
                        setMenuOpen(false);
                      };
                      const items = [
                        { show: true, label: "کسٹمر", icon: User, path: "/", mode: "customer" as AppMode },
                        { show: isRider, label: "رائیڈر", icon: Bike, path: "/rider-dashboard", mode: "rider" as AppMode },
                        { show: isRestaurantOwner, label: "دکان", icon: Store, path: "/restaurant-dashboard", mode: "restaurant" as AppMode },
                        { show: isAdmin || isStaff, label: "ایڈمن", icon: Shield, path: "/admin" },
                        { show: isSupport, label: "سپورٹ", icon: Headphones, path: "/support-dashboard" },
                        { show: isMechanic, label: "مکینک", icon: Wrench, path: "/mechanic-dashboard" },
                        { show: isServiceManager, label: t("role.serviceManager"), icon: ClipboardList, path: "/service-manager" },
                      ].filter((i) => i.show);
                      return (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 w-60 bg-card border rounded-xl shadow-elegant p-2 z-50">
                            <p className="px-1 pb-1.5 text-[11px] font-semibold text-muted-foreground">موڈ منتخب کریں</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {items.map(({ label, icon: Icon, path, mode }) => (
                                <button
                                  key={path}
                                  type="button"
                                  onClick={() => go(path, mode)}
                                  className="flex flex-col items-center justify-center gap-1 rounded-lg bg-secondary px-1 py-2 text-[11px] font-semibold text-foreground hover:bg-primary/10 transition-colors"
                                >
                                  <Icon className="w-4 h-4 text-primary" />
                                  <span className="leading-tight text-center">{label}</span>
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={async () => { await signOut(); navigate("/"); setMenuOpen(false); }}
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                            >
                              <LogOut className="w-4 h-4" /> لاگ آؤٹ
                            </button>
                          </div>
                        </>
                      );
                    })()}
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
