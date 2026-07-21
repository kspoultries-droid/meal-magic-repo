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

const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const RestaurantOwnerDashboard = lazy(() => import("./pages/RestaurantOwnerDashboard"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const Grocery = lazy(() => import("./pages/Grocery"));
const GroceryStoreDetail = lazy(() => import("./pages/GroceryStoreDetail"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Services = lazy(() => import("./pages/Services"));
const Wallet = lazy(() => import("./pages/Wallet"));
const SupportDashboard = lazy(() => import("./pages/SupportDashboard"));
const MechanicDashboard = lazy(() => import("./pages/MechanicDashboard"));
const StandaloneStore = lazy(() => import("./pages/StandaloneStore"));
const ServiceManagerDashboard = lazy(() => import("./pages/ServiceManagerDashboard"));
const Wholesale = lazy(() => import("./pages/Wholesale"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));

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
