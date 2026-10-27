import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useCourierNotifications } from "@/hooks/useCourierNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import { toast } from "sonner";
import Index from "./pages/Index";
import CartDrawer from "@/components/CartDrawer";
import FloatingCartBar from "@/components/cart/FloatingCartBar";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { ApkUpdateNotice } from "@/components/common/ApkUpdateNotice";
import { RoleStartRedirect } from "@/components/common/RoleStartRedirect";
import { RiderLocationProvider } from "@/contexts/RiderLocationContext";


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
            // Keep the push-notification worker: unregistering it kills the phone's push token.
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(
              regs
                .filter((r) => !(r.active || r.waiting || r.installing)?.scriptURL.includes("firebase-messaging-sw"))
                .map((r) => r.unregister()),
            );
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
const RiderPayments = lazyWithRetry(() => import("./pages/RiderPayments"));
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
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const OrderConfirmation = lazyWithRetry(() => import("./pages/OrderConfirmation"));
const Partner = lazyWithRetry(() => import("./pages/Partner"));
const Operations = lazyWithRetry(() => import("./pages/Operations"));
const Reels = lazyWithRetry(() => import("./pages/Reels"));
const CategoryPage = lazyWithRetry(() => import("./pages/CategoryPage"));

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
  usePushNotifications();
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
        () => import("./pages/ProductDetail"),
        () => import("./pages/Services"),
        () => import("./pages/Reels"),
        () => import("./pages/SearchPage"),
        () => import("./pages/Checkout"),
        () => import("./pages/Profile"),
      ];
      loaders.forEach((l, i) => setTimeout(() => l().catch(() => {}), i * 200));
    };
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(warm, { timeout: 2500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 1000);
    return () => clearTimeout(t);
  }, []);
  return null;
};

const RouteLoading = () => (
  <div className="min-h-screen bg-background px-4 py-6" aria-live="polite" aria-label="صفحہ لوڈ ہو رہا ہے">
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="h-14 rounded-2xl bg-muted animate-pulse" />
      <div className="h-36 rounded-3xl bg-muted animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-square rounded-2xl bg-muted animate-pulse" />)}
      </div>
    </div>
  </div>
);


const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <AuthProvider>
      <RiderLocationProvider>
      <CartProvider>
        <TooltipProvider>
          <GlobalErrorHandler>
            <Toaster />
            <Sonner />
            <ApkUpdateNotice />
            <CourierNotifications />
            <BrowserRouter>
              <RoutePrefetcher />
              <PullToRefresh />
              <RoleStartRedirect />
              <CartDrawer />
              <FloatingCartBar />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                  <Route path="/restaurant-dashboard" element={<RestaurantOwnerDashboard />} />
                  <Route path="/rider-dashboard" element={<RiderDashboard />} />
                  <Route path="/rider-payments" element={<RiderPayments />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/grocery" element={<Grocery />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/grocery/:id" element={<GroceryStoreDetail />} />
                  <Route path="/bazar/:id" element={<GroceryStoreDetail />} />
                  <Route path="/order-tracking/:id" element={<OrderTracking />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/support-dashboard" element={<SupportDashboard />} />
                  <Route path="/mechanic-dashboard" element={<MechanicDashboard />} />
                  <Route path="/store/:slug" element={<StandaloneStore />} />
                  <Route path="/service-manager" element={<ServiceManagerDashboard />} />
                  <Route path="/wholesale" element={<Wholesale />} />
                  <Route path="/bazar" element={<Wholesale />} />
                  <Route path="/order-confirmation/:type/:id" element={<OrderConfirmation />} />
                  <Route path="/partner" element={<Partner />} />
                  <Route path="/operations" element={<Operations />} />
                  <Route path="/reels" element={<Reels />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>


          </GlobalErrorHandler>
        </TooltipProvider>
      </CartProvider>
      </RiderLocationProvider>
    </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
