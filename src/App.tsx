import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import { useCourierNotifications } from "@/hooks/useCourierNotifications";
import { toast } from "sonner";
import Index from "./pages/Index";

// Auto-reload once when a lazy chunk fails to load (typically after a redeploy
// invalidates old hashed filenames). Prevents blank-screen from stale chunks.
const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(async () => {
    const RELOAD_KEY = "lovable:chunk-reloaded-at";
    const COOLDOWN = 15_000;
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isChunkErr =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (isChunkErr && Date.now() - last > COOLDOWN) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        // Drop any stale precached app shell before reloading.
        try {
          if ("caches" in window) {
            const names = await caches.keys();
            await Promise.allSettled(names.map((n) => caches.delete(n)));
          }
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(regs.map((r) => r.unregister()));
          }
        } catch {
          /* ignore */
        }
        window.location.reload();
        return { default: () => null } as unknown as T;
      }
      throw err;
    }
  });


const Auth = lazyWithRetry(() => import("./pages/Auth"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const RestaurantDetail = lazyWithRetry(() => import("./pages/RestaurantDetail"));
const RestaurantOwnerDashboard = lazyWithRetry(() => import("./pages/RestaurantOwnerDashboard"));
const RiderDashboard = lazyWithRetry(() => import("./pages/RiderDashboard"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const Grocery = lazyWithRetry(() => import("./pages/Grocery"));
const GroceryStoreDetail = lazyWithRetry(() => import("./pages/GroceryStoreDetail"));
const OrderTracking = lazyWithRetry(() => import("./pages/OrderTracking"));
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const Services = lazyWithRetry(() => import("./pages/Services"));
const Wallet = lazyWithRetry(() => import("./pages/Wallet"));
const SupportDashboard = lazyWithRetry(() => import("./pages/SupportDashboard"));
const MechanicDashboard = lazyWithRetry(() => import("./pages/MechanicDashboard"));
const StandaloneStore = lazyWithRetry(() => import("./pages/StandaloneStore"));
const ServiceManagerDashboard = lazyWithRetry(() => import("./pages/ServiceManagerDashboard"));
const Wholesale = lazyWithRetry(() => import("./pages/Wholesale"));
const OrderConfirmation = lazyWithRetry(() => import("./pages/OrderConfirmation"));
const Partner = lazyWithRetry(() => import("./pages/Partner"));
const Operations = lazyWithRetry(() => import("./pages/Operations"));
const Reels = lazyWithRetry(() => import("./pages/Reels"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const GlobalErrorHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("ایک خرابی آئی ہے۔ دوبارہ کوشش کریں۔");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return <>{children}</>;
};

const CourierNotifications = () => {
  useCourierNotifications();
  return null;
};

// Warm up the most-used route chunks while the browser is idle so navigation
// feels instant instead of waiting on a network fetch after the tap.
const RoutePrefetcher = () => {
  useEffect(() => {
    const warm = () => {
      const loaders = [
        () => import("./pages/Grocery"),
        () => import("./pages/RestaurantDetail"),
        () => import("./pages/GroceryStoreDetail"),
        () => import("./pages/Wholesale"),
        () => import("./pages/Services"),
        () => import("./pages/Reels"),
        () => import("./pages/SearchPage"),
        () => import("./pages/Checkout"),
        () => import("./pages/Profile"),
      ];
      loaders.forEach((l, i) => setTimeout(() => l().catch(() => {}), i * 250));
    };
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(warm, { timeout: 3000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <GlobalErrorHandler>
            <Toaster />
            <Sonner />
            <CourierNotifications />
            <BrowserRouter>
              <RoutePrefetcher />
              <CartDrawer />
              <FloatingCartBar />
              <Suspense fallback={<div className="min-h-screen bg-background" />}>

          </GlobalErrorHandler>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
