import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, History, CheckCircle2, Clock, XCircle, Package, ArrowLeft, Tag } from "lucide-react";
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
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");

  useEffect(() => {
    if (isOpen && user && activeTab === "orders") {
      fetchCompletedOrders();
    }
  }, [isOpen, user, activeTab]);

  useEffect(() => {
    const sourceId = items[0]?.sourceId;
    const isGrocery = items[0]?.source === "grocery";
    if (!isOpen || !sourceId || !isGrocery) {
      setRecommendedProducts([]);
      return;
    }
    supabase.from("grocery_products")
      .select("id,name,price,discount_price,image_url")
      .eq("store_id", sourceId)
      .eq("is_available", true)
      .limit(5)
      .then(({ data }) => setRecommendedProducts((data || []).filter((product: any) => !items.some((item) => item.menu_item_id === product.id))));
  }, [isOpen, items]);

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
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-gradient-to-b from-background via-background to-secondary/30 border-l border-border/50 h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] top-0 bottom-auto">
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
                 <Button variant="outline" className="mt-4" onClick={() => { setIsOpen(false); navigate("/wholesale"); }}>بازار دیکھیں <ArrowLeft className="ms-2 h-4 w-4" /></Button>
               </div>
             ) : (
               <>
                 <div className="flex-1 overflow-y-auto space-y-2.5 py-4">
                   {items.map((item, idx) => (
                     <div key={item.id} style={{ animationDelay: `${idx * 40}ms` }} className="flex gap-3 glass border border-border/50 rounded-2xl p-3 shadow-card animate-fade-in hover:shadow-elegant transition-shadow">
                       <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border/50">
                         {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <Package className="m-auto mt-5 h-6 w-6 text-muted-foreground" />}
                       </div>
                       <div className="flex min-w-0 flex-1 flex-col">
                         <p className="font-bold text-foreground text-sm truncate">{item.name}</p>
                         <p className="text-[11px] text-muted-foreground truncate">{item.restaurant}</p>
                         {(item.variant_label || (item.options && item.options.length > 0)) && <p className="text-[10px] text-muted-foreground truncate">{item.variant_label || item.options?.map((o) => o.choice).join(" • ")}</p>}
                         <p className="text-sm font-extrabold text-primary mt-auto">Rs. {item.price.toLocaleString()} فی عدد</p>
                       </div>
                       <div className="flex flex-col items-end justify-between">
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="آئٹم حذف کریں" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                         <div className="flex items-center gap-1 rounded-full border border-border/50 bg-background/80 p-0.5">
                           <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" aria-label="مقدار کم کریں" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                           <span className="w-4 text-center text-xs font-extrabold">{item.quantity}</span>
                           <Button size="icon" className="h-6 w-6 rounded-full" aria-label="مقدار بڑھائیں" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                         </div>
                       </div>
                     </div>
                   ))}
                   {recommendedProducts.length > 0 && (
                     <div className="pt-2">
                       <div className="mb-2 flex items-center justify-between"><p className="text-xs font-extrabold text-foreground">مزید شامل کریں</p><Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={() => { setIsOpen(false); navigate("/wholesale"); }}>سب دیکھیں</Button></div>
                       <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                         {recommendedProducts.map((product) => { const price = product.discount_price || product.price; return <button key={product.id} type="button" onClick={() => { setIsOpen(false); navigate(`/product/${product.id}`); }} className="w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left"><div className="h-20 bg-secondary">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <Package className="m-auto mt-6 h-6 w-6 text-muted-foreground" />}</div><div className="p-1.5"><p className="truncate text-[10px] font-bold text-foreground">{product.name}</p><p className="text-[11px] font-extrabold text-primary">Rs {price}</p></div></button>; })}
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="glass border-t border-border/50 -mx-4 px-4 pt-4 pb-5 space-y-2.5 shadow-elegant rounded-t-3xl">
                   <div className="flex justify-between text-xs"><span className="text-muted-foreground">سب ٹوٹل</span><span className="font-bold text-foreground">Rs. {totalPrice.toLocaleString()}</span></div>
                   <div className="flex justify-between text-xs"><span className="text-muted-foreground">ڈیلیوری</span><span className="font-bold text-success">چیک آؤٹ پر حساب</span></div>
                   <div className="flex justify-between text-xs"><span className="text-muted-foreground">واؤچر رعایت</span><span className="font-bold text-muted-foreground">چیک آؤٹ پر شامل کریں</span></div>
                   <div className="flex justify-between items-baseline border-t border-dashed pt-3"><span className="font-bold text-foreground">کل قیمت</span><span className="text-2xl font-extrabold text-primary">Rs. {totalPrice.toLocaleString()}</span></div>
                   <Button className="w-full h-12 text-base font-bold" onClick={() => { setIsOpen(false); navigate("/checkout"); }}>چیک آؤٹ کریں — Rs. {totalPrice.toLocaleString()}</Button>
                   <Button variant="ghost" onClick={clearCart} className="w-full text-xs text-muted-foreground hover:text-destructive">کارٹ خالی کریں</Button>
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
