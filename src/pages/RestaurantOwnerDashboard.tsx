import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Store, UtensilsCrossed, ShoppingBag, Plus, Trash2, RefreshCw, ArrowLeft, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";

const RestaurantOwnerDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasRole, setHasRole] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "restaurant_owner" as any })
        .then(({ data }) => setHasRole(!!data));
    }
  }, [user]);

  if (loading || hasRole === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;

  if (!hasRole) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">آپ ریسٹورنٹ اونر نہیں ہیں</h2>
          <p className="text-muted-foreground mb-4">ایڈمن سے ریسٹورنٹ اونر کا رول حاصل کریں</p>
          <Button variant="outline" onClick={() => navigate("/")}>واپس جائیں</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-primary">ریسٹورنٹ ڈیش بورڈ</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>
      <div className="p-6">
        <Tabs defaultValue="restaurant">
          <TabsList className="mb-6">
            <TabsTrigger value="restaurant" className="gap-1"><Store className="h-4 w-4" /> میرا ریسٹورنٹ</TabsTrigger>
            <TabsTrigger value="menu" className="gap-1"><UtensilsCrossed className="h-4 w-4" /> مینو</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" /> آرڈرز</TabsTrigger>
          </TabsList>
          <TabsContent value="restaurant"><MyRestaurantTab /></TabsContent>
          <TabsContent value="menu"><MenuTab /></TabsContent>
          <TabsContent value="orders"><OwnerOrdersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const MyRestaurantTab = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cuisines: "", delivery_time: "30-45 min", image_url: "" });
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: rests }, { data: citiesData }] = await Promise.all([
      supabase.from("restaurants").select("*").eq("owner_id", user!.id),
      supabase.from("cities").select("*").order("name"),
    ]);
    setRestaurants(rests || []);
    setCities(citiesData || []);
    if (citiesData?.length && !selectedCity) setSelectedCity(citiesData[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const deleteRestaurant = async (id: string) => {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ریسٹورنٹ حذف ہو گیا!");
    fetchAll();
  };

  const addRestaurant = async () => {
    if (!form.name.trim() || !selectedCity) { toast.error("نام اور شہر درکار ہے"); return; }
    const { error } = await supabase.from("restaurants").insert({
      name: form.name,
      description: form.description,
      cuisines: form.cuisines.split(",").map((s) => s.trim()).filter(Boolean),
      delivery_time: form.delivery_time,
      image_url: form.image_url,
      city_id: selectedCity,
      owner_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("ریسٹورنٹ شامل ہو گیا!");
    setShowAdd(false);
    setForm({ name: "", description: "", cuisines: "", delivery_time: "30-45 min", image_url: "" });
    fetchAll();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>میرے ریسٹورنٹس</CardTitle>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> نیا ریسٹورنٹ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نیا ریسٹورنٹ شامل کریں</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="ریسٹورنٹ کا نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="تفصیل" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="کھانے کی اقسام (کاما سے الگ)" value={form.cuisines} onChange={(e) => setForm({ ...form, cuisines: e.target.value })} />
              <Input placeholder="ڈلیوری وقت (مثلاً 30-45 min)" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
              <Input placeholder="تصویر URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <select className="w-full border rounded-md p-2 bg-background text-foreground" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button className="w-full" onClick={addRestaurant}>شامل کریں</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : restaurants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">ابھی کوئی ریسٹورنٹ نہیں — اوپر سے شامل کریں</p>
        ) : (
          <div className="grid gap-4">
            {restaurants.map((r) => (
              <div key={r.id} className="flex gap-4 bg-secondary/30 rounded-xl p-4 border">
                {r.image_url && <img src={r.image_url} alt={r.name} className="w-24 h-24 rounded-lg object-cover" />}
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={r.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {r.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                    <Badge variant="outline">⭐ {r.rating}</Badge>
                    <Badge variant="outline">{r.delivery_time}</Badge>
                  </div>
                  <Button size="sm" variant="destructive" className="mt-2 h-7 text-xs" onClick={() => deleteRestaurant(r.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> حذف کریں
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MenuTab = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRest, setSelectedRest] = useState("");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "Main", image_url: "" });
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", category: "", image_url: "" });

  useEffect(() => {
    supabase.from("restaurants").select("id,name").eq("owner_id", user!.id).then(({ data }) => {
      setRestaurants(data || []);
      if (data?.length) setSelectedRest(data[0].id);
    });
  }, [user]);

  const fetchMenu = () => {
    if (selectedRest) {
      setLoading(true);
      supabase.from("menu_items").select("*").eq("restaurant_id", selectedRest).order("category").then(({ data }) => {
        setMenuItems(data || []);
        setLoading(false);
      });
    }
  };

  useEffect(() => { fetchMenu(); }, [selectedRest]);

  const addItem = async () => {
    if (!form.name || !form.price) { toast.error("نام اور قیمت درکار ہے"); return; }
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: selectedRest,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category || "Main",
      image_url: form.image_url,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("آئٹم شامل ہو گئی!");
    setShowAdd(false);
    setForm({ name: "", description: "", price: "", category: "Main", image_url: "" });
    fetchMenu();
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetchMenu();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    toast.success("حذف ہو گیا");
    fetchMenu();
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "Main",
      image_url: item.image_url || "",
    });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.price) { toast.error("نام اور قیمت درکار ہے"); return; }
    const { error } = await supabase.from("menu_items").update({
      name: editForm.name,
      description: editForm.description,
      price: Number(editForm.price),
      category: editForm.category,
      image_url: editForm.image_url,
    }).eq("id", editItem.id);
    if (error) { toast.error(error.message); return; }
    toast.success("آئٹم اپڈیٹ ہو گئی!");
    setEditItem(null);
    fetchMenu();
  };

  if (restaurants.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">پہلے ریسٹورنٹ شامل کریں</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>مینو</CardTitle>
          <select className="border rounded-md p-1.5 bg-background text-foreground text-sm" value={selectedRest} onChange={(e) => setSelectedRest(e.target.value)}>
            {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی آئٹم</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نئی مینو آئٹم</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="آئٹم کا نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="تفصیل" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="قیمت" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input placeholder="کیٹگری (مثلاً Main, Drinks)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="تصویر URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <Button className="w-full" onClick={addItem}>شامل کریں</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کیٹگری</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>دستیاب</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell>Rs {m.price}</TableCell>
                  <TableCell>
                    <Badge className={m.is_available ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {m.is_available ? "ہاں" : "نہیں"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(m)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleAvailability(m.id, m.is_available)}>
                      {m.is_available ? "بند" : "فعال"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteItem(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {menuItems.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">کوئی آئٹم نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>آئٹم ایڈٹ کریں</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="آئٹم کا نام" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Input placeholder="تفصیل" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <Input placeholder="قیمت" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              <Input placeholder="کیٹگری" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
              <Input placeholder="تصویر URL" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
              <Button className="w-full" onClick={saveEdit}>اپڈیٹ کریں</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const OwnerOrdersTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  const fetchOrders = async () => {
    setLoading(true);
    const { data: rests } = await supabase.from("restaurants").select("id").eq("owner_id", user!.id);
    if (rests?.length) {
      const ids = rests.map((r) => r.id);
      const { data } = await supabase.from("orders").select("*, order_items(*)").in("restaurant_id", ids).order("created_at", { ascending: false }).limit(50);
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("owner-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        fetchOrders();
        if (payload.eventType === 'INSERT') {
          triggerAlert();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchOrders();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", preparing: "bg-accent text-accent-foreground", delivering: "bg-primary text-primary-foreground", delivered: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نیا فوڈ آرڈر! / New food order!" />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>آرڈرز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">کوئی آرڈر نہیں</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span className="ml-3 font-bold">Rs {o.total_amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(o.status)}>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</span>
                  </div>
                </div>

                {/* Order Items */}
                <button className="text-xs text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                  {expandedOrder === o.id ? "آئٹمز چھپائیں ▲" : `آئٹمز دیکھیں (${o.order_items?.length || 0}) ▼`}
                </button>
                {expandedOrder === o.id && o.order_items?.length > 0 && (
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                    {o.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-bold">Rs {item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {o.delivery_address && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
                {o.notes && <p className="text-xs text-muted-foreground">📝 {o.notes}</p>}

                {/* Status Actions */}
                <div className="flex gap-1 flex-wrap">
                  {o.status === "pending" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(o.id, "confirmed")}>✅ تصدیق</Button>}
                  {o.status === "confirmed" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(o.id, "preparing")}>👨‍🍳 تیاری شروع</Button>}
                  {o.status === "preparing" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(o.id, "delivering")}>🏍️ بھیج دیا</Button>}
                  {o.status !== "cancelled" && o.status !== "delivered" && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateStatus(o.id, "cancelled")}>❌ منسوخ</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantOwnerDashboard;
