import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import { toast } from "sonner";
import Index from "./pages/Index";

// Auto-reload once when a lazy chunk fails to load (typically after a redeploy
// invalidates old hashed filenames). Prevents blank-screen from stale chunks.
const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(async () => {
    const RELOAD_KEY = "lovable:chunk-reloaded";
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isChunkErr =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkErr && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Return an empty component while the page reloads.
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <GlobalErrorHandler>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                  <Route path="/restaurant-dashboard" element={<RestaurantOwnerDashboard />} />
                  <Route path="/rider-dashboard" element={<RiderDashboard />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/grocery" element={<Grocery />} />
                  <Route path="/grocery/:id" element={<GroceryStoreDetail />} />
                  <Route path="/order-tracking/:id" element={<OrderTracking />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/support-dashboard" element={<SupportDashboard />} />
                  <Route path="/mechanic-dashboard" element={<MechanicDashboard />} />
                  <Route path="/store/:slug" element={<StandaloneStore />} />
                  <Route path="/service-manager" element={<ServiceManagerDashboard />} />
                  <Route path="/wholesale" element={<Wholesale />} />
                  <Route path="/order-confirmation/:type/:id" element={<OrderConfirmation />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </GlobalErrorHandler>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
