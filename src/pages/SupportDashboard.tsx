import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, User, ShoppingBag, MapPin, Phone, Eye, FileImage, Wrench } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import TicketsQueue from "@/components/support/TicketsQueue";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const ORDER_STATUS: Record<string, { key: string; color: string }> = {
  pending: { key: "sup.st.pending", color: "bg-yellow-100 text-yellow-800" },
  preparing: { key: "sup.st.preparing", color: "bg-blue-100 text-blue-800" },
  delivering: { key: "sup.st.delivering", color: "bg-orange-100 text-orange-800" },
  completed: { key: "sup.st.completed", color: "bg-green-100 text-green-800" },
  cancelled: { key: "sup.st.cancelled", color: "bg-destructive/20 text-destructive" },
  quoted: { key: "sup.st.quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { key: "sup.st.confirmed", color: "bg-primary/20 text-primary" },
};

const SupportDashboard = () => {
  const { user, loading, isSupport, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [groceryOrders, setGroceryOrders] = useState<any[]>([]);
  const [serviceBookings, setServiceBookings] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isSupport && !isAdmin) {
      navigate("/");
      toast.error(t("sup.noAccess"));
    }
  }, [loading, isSupport, isAdmin]);

  const fetchAll = async () => {
    setLoadingData(true);
    const [{ data: o }, { data: g }, { data: s }] = await Promise.all([
      supabase.from("orders").select("*, restaurants(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("grocery_list_orders").select("*, grocery_stores(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_bookings").select("*, services(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setOrders(o || []);
    setGroceryOrders(g || []);
    setServiceBookings(s || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (user && (isSupport || isAdmin)) fetchAll();
  }, [user, isSupport, isAdmin]);

  const fetchCustomer = async (customerId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", customerId).single();
    setCustomerProfile(data);
  };

  const updateOrderStatus = async (id: string, status: string, type: string) => {
    const table = type === "food" ? "orders" : type === "grocery" ? "grocery_list_orders" : "service_bookings";
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("sup.statusUpdated")); setSelectedOrder(null); fetchAll(); }
  };

  const openOrder = (order: any, type: string) => {
    setSelectedOrder(order);
    setSelectedType(type);
    fetchCustomer(order.customer_id);
  };

  const filterBySearch = (items: any[], fields: string[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item =>
      fields.some(f => {
        const val = f.includes(".") ? f.split(".").reduce((o, k) => o?.[k], item) : item[f];
        return val && String(val).toLowerCase().includes(q);
      }) || item.id?.toLowerCase().includes(q)
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isSupport && !isAdmin) return null;

  const stats = {
    foodPending: orders.filter(o => o.status === "pending").length,
    groceryPending: groceryOrders.filter(o => o.status === "pending").length,
    servicePending: serviceBookings.filter(o => o.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">{t("sup.title")}</h1>
          <LanguageSwitcher />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("sup.foodPending")}</p>
            <p className="text-2xl font-extrabold text-orange-600">{stats.foodPending}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("sup.groceryPending")}</p>
            <p className="text-2xl font-extrabold text-green-600">{stats.groceryPending}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("sup.servicePending")}</p>
            <p className="text-2xl font-extrabold text-blue-600">{stats.servicePending}</p>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("sup.searchPlaceholder")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="food">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="tickets" className="text-xs">🆘 شکایات</TabsTrigger>
            <TabsTrigger value="food" className="text-xs">🍔 {t("sup.foodOrders")}</TabsTrigger>
            <TabsTrigger value="grocery" className="text-xs">🛒 {t("admin.grocery")}</TabsTrigger>
            <TabsTrigger value="services" className="text-xs">🔧 {t("admin.services")}</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets"><TicketsQueue /></TabsContent>

          {/* Food Orders */}
          <TabsContent value="food">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm flex items-center gap-1"><ShoppingBag className="w-4 h-4" /> {t("sup.foodOrders")} ({orders.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-3 w-3" /></Button>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {loadingData ? <p className="text-center text-muted-foreground py-4">{t("common.loading")}</p> :
                  filterBySearch(orders, ["delivery_address", "restaurants.name"]).map(order => (
                    <div key={order.id} onClick={() => openOrder(order, "food")}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                          <Badge className={ORDER_STATUS[order.status]?.color || ""}>{ORDER_STATUS[order.status] ? t(ORDER_STATUS[order.status].key as any) : order.status}</Badge>
                          <span className="text-sm font-bold text-primary">Rs {order.total_amount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">🏪 {order.restaurants?.name || "N/A"}</p>
                        {order.delivery_address && <p className="text-xs text-muted-foreground truncate"><MapPin className="w-3 h-3 inline" /> {order.delivery_address}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ur-PK")}</p>
                        <Eye className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grocery Orders */}
          <TabsContent value="grocery">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm flex items-center gap-1"><FileImage className="w-4 h-4" /> {t("sup.groceryOrders")} ({groceryOrders.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-3 w-3" /></Button>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {loadingData ? <p className="text-center text-muted-foreground py-4">{t("common.loading")}</p> :
                  filterBySearch(groceryOrders, ["delivery_address", "grocery_stores.name"]).map(order => (
                    <div key={order.id} onClick={() => openOrder(order, "grocery")}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/50 cursor-pointer transition-colors">
                      {order.image_url && <img src={order.image_url} alt="List" className="w-12 h-12 rounded-lg object-cover border flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                          <Badge className={ORDER_STATUS[order.status]?.color || ""}>{ORDER_STATUS[order.status] ? t(ORDER_STATUS[order.status].key as any) : order.status}</Badge>
                          {order.total_amount > 0 && <span className="text-sm font-bold text-primary">Rs {order.total_amount}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">🏪 {order.grocery_stores?.name || "N/A"}</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Bookings */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm flex items-center gap-1"><Wrench className="w-4 h-4" /> {t("sup.serviceBookings")} ({serviceBookings.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-3 w-3" /></Button>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {loadingData ? <p className="text-center text-muted-foreground py-4">{t("common.loading")}</p> :
                  filterBySearch(serviceBookings, ["address", "services.name"]).map(booking => (
                    <div key={booking.id} onClick={() => openOrder(booking, "service")}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">#{booking.id.slice(0, 8)}</span>
                          <Badge className={ORDER_STATUS[booking.status]?.color || ""}>{ORDER_STATUS[booking.status] ? t(ORDER_STATUS[booking.status].key as any) : booking.status}</Badge>
                          <span className="text-sm font-bold text-primary">Rs {booking.total_amount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">🔧 {booking.services?.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground truncate"><MapPin className="w-3 h-3 inline" /> {booking.address}</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("sup.orderDetail")}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              {/* Customer Profile */}
              {customerProfile && (
                <Card className="bg-accent/30">
                  <CardContent className="p-3">
                    <p className="text-xs font-bold mb-1 flex items-center gap-1"><User className="w-3 h-3" /> {t("sup.customer")}</p>
                    <p className="text-sm font-semibold">{customerProfile.full_name || t("sup.noName")}</p>
                    {customerProfile.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {customerProfile.phone}</p>}
                    {customerProfile.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {customerProfile.address}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">#{selectedOrder.id.slice(0, 8)}</span></div>
                <div><span className="text-muted-foreground">{t("sup.status")}:</span> <Badge className={ORDER_STATUS[selectedOrder.status]?.color}>{ORDER_STATUS[selectedOrder.status] ? t(ORDER_STATUS[selectedOrder.status].key as any) : selectedOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">{t("sup.amount")}:</span> <strong>Rs {selectedOrder.total_amount || 0}</strong></div>
                <div><span className="text-muted-foreground">{t("sup.payment")}:</span> {selectedOrder.payment_method || "COD"}</div>
              </div>

              {selectedOrder.delivery_address && <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>}
              {selectedOrder.address && !selectedOrder.delivery_address && <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.address}</p>}
              {selectedOrder.notes && <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>{t("sup.note")}:</strong> {selectedOrder.notes}</p>}

              {/* Grocery image */}
              {selectedType === "grocery" && selectedOrder.image_url && (
                <img src={selectedOrder.image_url} alt="List" className="w-full rounded-xl border max-h-48 object-contain bg-secondary" />
              )}

              {/* Status update buttons */}
              <div>
                <p className="text-xs font-bold mb-2">{t("sup.changeStatus")}</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ORDER_STATUS).filter(([s]) => s !== selectedOrder.status).map(([s, info]) => (
                    <Button key={s} size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => updateOrderStatus(selectedOrder.id, s, selectedType)}>
                      {t(info.key as any)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportDashboard;
