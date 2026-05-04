import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, History, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "بھیج دی / Sent", icon: <Clock className="w-3 h-3" />, color: "text-yellow-600" },
  quoted: { label: "قیمت آئی / Quoted", icon: <Clock className="w-3 h-3" />, color: "text-blue-600" },
  confirmed: { label: "تصدیق / Confirmed", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-primary" },
  delivering: { label: "ڈلیوری / Delivering", icon: <Clock className="w-3 h-3" />, color: "text-orange-600" },
  completed: { label: "مکمل ✅", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-green-600" },
  cancelled: { label: "منسوخ / Cancelled", icon: <XCircle className="w-3 h-3" />, color: "text-destructive" },
};

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");

  useEffect(() => {
    if (isOpen && user && activeTab === "orders") {
      fetchCompletedOrders();
    }
  }, [isOpen, user, activeTab]);

  const fetchCompletedOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setCompletedOrders(data || []);
    setLoadingOrders(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-gradient-to-b from-background via-background to-secondary/30 border-l border-border/50">
        <SheetHeader className="px-6 pt-6 pb-3 bg-gradient-hero text-primary-foreground shadow-glow">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <div className="w-9 h-9 rounded-full glass flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-lg font-extrabold">آپ کا کارٹ</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 grid grid-cols-2 glass border border-border/50 p-1 h-11">
            <TabsTrigger value="cart" className="gap-1.5 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md">
              <ShoppingBag className="w-4 h-4" /> کارٹ ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md">
              <History className="w-4 h-4" /> آرڈرز
            </TabsTrigger>
          </TabsList>

          {/* Cart Tab */}
          <TabsContent value="cart" className="flex-1 flex flex-col overflow-hidden px-4 mt-0">
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
                <div className="w-24 h-24 rounded-full glass flex items-center justify-center mb-4 shadow-card">
                  <ShoppingBag className="w-12 h-12 opacity-40" />
                </div>
                <p className="text-lg font-bold text-foreground">کارٹ خالی ہے</p>
                <p className="text-sm mt-1">آئٹمز شامل کرنا شروع کریں 🛒</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2.5 py-4">
                  {items.map((item, idx) => (
                    <div key={item.id} style={{ animationDelay: `${idx * 40}ms` }} className="flex gap-3 glass border border-border/50 rounded-2xl p-3 shadow-card animate-fade-in hover:shadow-elegant transition-shadow">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover ring-1 ring-border/50" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.restaurant}</p>
                        <p className="text-sm font-extrabold text-primary mt-1">Rs. {item.price}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 bg-background/80 rounded-full p-0.5 border border-border/50">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-extrabold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass border-t border-border/50 -mx-4 px-4 pt-4 pb-5 space-y-3 shadow-elegant rounded-t-3xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">سب ٹوٹل</span>
                    <span className="font-bold text-foreground">Rs. {totalPrice}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-dashed pt-3">
                    <span className="font-bold text-foreground">کل قیمت</span>
                    <span className="text-2xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">Rs. {totalPrice}</span>
                  </div>
                  <Button className="w-full h-12 text-base font-bold bg-gradient-primary shadow-glow hover:shadow-elegant hover:scale-[1.02] transition-all" onClick={() => { setIsOpen(false); navigate("/checkout"); }}>
                    چیک آؤٹ کریں — Rs. {totalPrice}
                  </Button>
                  <button onClick={clearCart} className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors">
                    کارٹ خالی کریں
                  </button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="flex-1 overflow-y-auto px-6 mt-0">
            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16">
                <p className="text-sm">آرڈرز دیکھنے کے لیے لاگ ان کریں</p>
              </div>
            ) : loadingOrders ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <p>لوڈ ہو رہا ہے...</p>
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16">
                <History className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-semibold">کوئی آرڈر نہیں</p>
                <p className="text-sm">آپ کے آرڈرز یہاں دکھائی دیں گے</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {completedOrders.map((order) => {
                  const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                  const orderItems = order.order_items || [];
                  const date = new Date(order.created_at).toLocaleDateString("ur-PK", {
                    day: "numeric", month: "short", year: "numeric"
                  });
                  return (
                    <div key={order.id} className="bg-secondary/50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-xs font-bold flex items-center gap-1 ${status.color}`}>
                            {status.icon} {status.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
                        </div>
                        <p className="text-sm font-extrabold text-primary">Rs. {order.total_amount}</p>
                      </div>
                      {orderItems.length > 0 && (
                        <div className="space-y-1">
                          {orderItems.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                              <span>{item.name} × {item.quantity}</span>
                              <span>Rs. {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {order.delivery_address && (
                        <p className="text-[10px] text-muted-foreground truncate">📍 {order.delivery_address}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
