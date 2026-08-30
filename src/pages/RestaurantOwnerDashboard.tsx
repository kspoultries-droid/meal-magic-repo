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
import { LogOut, Store, UtensilsCrossed, ShoppingBag, Plus, Trash2, RefreshCw, ArrowLeft, Pencil, Bike, Clapperboard, Wallet } from "lucide-react";
import MyReelsManager from "@/components/reels/MyReelsManager";
import EarningsPanel from "@/components/vendor/EarningsPanel";
import SalesReport from "@/components/vendor/SalesReport";
import VendorReviewsPanel from "@/components/reviews/VendorReviewsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import { VariantsEditor, OptionGroupsEditor, sanitizeVariants, sanitizeGroups, type VariantRow, type OptionGroupRow } from "@/components/menu/MenuOptionsEditor";

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
            <TabsTrigger value="reels" className="gap-1"><Clapperboard className="h-4 w-4" /> ریلز</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1"><Wallet className="h-4 w-4" /> کمائی</TabsTrigger>
          </TabsList>
          <TabsContent value="restaurant"><MyRestaurantTab /></TabsContent>
          <TabsContent value="menu"><MenuTab /></TabsContent>
          <TabsContent value="orders"><OwnerOrdersTab /></TabsContent>
          <TabsContent value="reels"><MyReelsManager /></TabsContent>
          <TabsContent value="earnings"><EarningsPanel /></TabsContent>

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
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge className={r.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {r.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                    <Badge variant="outline">⭐ {r.rating}</Badge>
                    <Badge variant="outline">{r.delivery_time}</Badge>
                  </div>

                  {/* Timing & Open/Close Toggle */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground">🕐</span>
                    <input
                      type="time"
                      className="h-7 text-xs border rounded-md px-2 bg-background text-foreground"
                      defaultValue={(r as any).opening_time || "08:00"}
                      onChange={async (e) => {
                        await supabase.from("restaurants").update({ opening_time: e.target.value } as any).eq("id", r.id);
                        toast.success("ٹائمنگ اپڈیٹ"); fetchAll();
                      }}
                    />
                    <span className="text-xs text-muted-foreground">سے</span>
                    <input
                      type="time"
                      className="h-7 text-xs border rounded-md px-2 bg-background text-foreground"
                      defaultValue={(r as any).closing_time || "22:00"}
                      onChange={async (e) => {
                        await supabase.from("restaurants").update({ closing_time: e.target.value } as any).eq("id", r.id);
                        toast.success("ٹائمنگ اپڈیٹ"); fetchAll();
                      }}
                    />
                    <button
                      onClick={async () => {
                        await supabase.from("restaurants").update({ is_active: !r.is_active }).eq("id", r.id);
                        toast.success(r.is_active ? "بند ہو گیا" : "کھل گیا"); fetchAll();
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        r.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {r.is_active ? "🟢 کھلا / Open" : "🔴 بند / Closed"}
                    </button>
                  </div>

                  {/* Delivery Mode */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground">🚚 ڈلیوری:</span>
                    <select
                      className="h-7 text-xs border rounded-md px-2 bg-background text-foreground"
                      value={(r as any).delivery_mode || "platform"}
                      onChange={async (e) => {
                        await supabase.from("restaurants").update({ delivery_mode: e.target.value } as any).eq("id", r.id);
                        toast.success("ڈلیوری موڈ اپڈیٹ"); fetchAll();
                      }}
                    >
                      <option value="platform">EasyLife رائیڈرز (پلیٹ فارم فیس)</option>
                      <option value="self">میں خود ڈلیوری کروں گا (مفت — بغیر رائیڈر)</option>
                      <option value="both">دونوں (رائیڈر یا خود)</option>
                    </select>
                  </div>

                  {/* Pickup Address (for riders) */}
                  <div className="mt-2 bg-secondary/40 border border-border/60 rounded-lg px-3 py-2 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">📍 پک اپ لوکیشن (رائیڈر یہاں آئے گا)</p>
                    <input
                      type="text"
                      placeholder="مکمل پتہ — مثلاً شاپ #12، مین بازار، رحیم یار خان"
                      className="w-full h-8 text-xs border rounded-md px-2 bg-background text-foreground"
                      defaultValue={(r as any).pickup_address || ""}
                      onBlur={async (e) => {
                        if (e.target.value === ((r as any).pickup_address || "")) return;
                        await supabase.from("restaurants").update({ pickup_address: e.target.value } as any).eq("id", r.id);
                        toast.success("پک اپ ایڈریس اپڈیٹ"); fetchAll();
                      }}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="h-7 px-2 text-xs font-bold rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        onClick={() => {
                          if (!navigator.geolocation) { toast.error("GPS دستیاب نہیں"); return; }
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            await supabase.from("restaurants").update({
                              pickup_lat: pos.coords.latitude,
                              pickup_lng: pos.coords.longitude,
                            } as any).eq("id", r.id);
                            toast.success("GPS محفوظ ہو گیا 📍"); fetchAll();
                          }, () => toast.error("GPS نہیں مل سکا"), { enableHighAccuracy: true, timeout: 10000 });
                        }}
                      >
                        📍 موجودہ GPS محفوظ کریں
                      </button>
                      {(r as any).pickup_lat && (r as any).pickup_lng && (
                        <span className="text-[10px] text-primary font-semibold">
                          GPS: {Number((r as any).pickup_lat).toFixed(4)}, {Number((r as any).pickup_lng).toFixed(4)}
                        </span>
                      )}
                    </div>
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
  const [formVariants, setFormVariants] = useState<VariantRow[]>([]);
  const [formGroups, setFormGroups] = useState<OptionGroupRow[]>([]);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", category: "", image_url: "" });
  const [editVariants, setEditVariants] = useState<VariantRow[]>([]);
  const [editGroups, setEditGroups] = useState<OptionGroupRow[]>([]);

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
      variants: sanitizeVariants(formVariants) as any,
      option_groups: sanitizeGroups(formGroups) as any,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("آئٹم شامل ہو گئی!");
    setShowAdd(false);
    setForm({ name: "", description: "", price: "", category: "Main", image_url: "" });
    setFormVariants([]); setFormGroups([]);
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
    setEditVariants((item.variants || []) as VariantRow[]);
    setEditGroups((item.option_groups || []) as OptionGroupRow[]);
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.price) { toast.error("نام اور قیمت درکار ہے"); return; }
    const { error } = await supabase.from("menu_items").update({
      name: editForm.name,
      description: editForm.description,
      price: Number(editForm.price),
      category: editForm.category,
      image_url: editForm.image_url,
      variants: sanitizeVariants(editVariants) as any,
      option_groups: sanitizeGroups(editGroups) as any,
    } as any).eq("id", editItem.id);
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>نئی مینو آئٹم</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="آئٹم کا نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="تفصیل" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="بنیادی قیمت (اگر variants نہیں تو)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input placeholder="کیٹگری (مثلاً Main, Drinks)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="تصویر URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <VariantsEditor value={formVariants} onChange={setFormVariants} />
              <OptionGroupsEditor value={formGroups} onChange={setFormGroups} />
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>آئٹم ایڈٹ کریں</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="آئٹم کا نام" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Input placeholder="تفصیل" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <Input placeholder="بنیادی قیمت" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              <Input placeholder="کیٹگری" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
              <Input placeholder="تصویر URL" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
              <VariantsEditor value={editVariants} onChange={setEditVariants} />
              <OptionGroupsEditor value={editGroups} onChange={setEditGroups} />
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
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*), restaurants(name, delivery_mode)")
        .in("restaurant_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders(data || []);
    } else {
      setOrders([]);
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

  const updateStatus = async (order: any, status: string) => {
    if (["delivered", "completed", "cancelled"].includes(order.status)) {
      toast.error("یہ آرڈر بند ہو چکا ہے — اسے واپس پچھلے مرحلے میں نہیں لے جا سکتے");
      return;
    }
    const allowedNext: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["delivering", "cancelled"],
      delivering: ["delivered"],
    };
    if (!allowedNext[order.status]?.includes(status)) {
      toast.error("سٹیٹس صرف اگلے مرحلے پر جا سکتا ہے");
      return;
    }

    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchOrders();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", preparing: "bg-accent text-accent-foreground", delivering: "bg-primary text-primary-foreground", delivered: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  const activeOrders = orders.filter((o) => !["delivered", "completed", "cancelled"].includes(o.status));
  const doneOrders = orders.filter((o) => ["delivered", "completed", "cancelled"].includes(o.status));

  const renderActive = (o: any) => {
    const deliveryMode = o.restaurants?.delivery_mode || "platform";
    const needsPlatformRider = deliveryMode === "platform";
    const canSend = o.status === "preparing" && (!needsPlatformRider || o.rider_id);
    const restaurantCanFinish = o.status === "delivering" && (deliveryMode === "self" || (deliveryMode === "both" && !o.rider_id));
    return (
      <div key={o.id} className="border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
            <span className="ml-3 font-bold">Rs {o.total_amount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor(o.status)}>{o.status}</Badge>
            {deliveryMode === "self" && <Badge variant="outline">خود ڈلیوری</Badge>}
            {deliveryMode !== "self" && o.rider_id && <Badge variant="outline" className="gap-1"><Bike className="w-3 h-3" /> رائیڈر اسائن</Badge>}
            <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</span>
          </div>
        </div>

        <button className="text-xs text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
          {expandedOrder === o.id ? "آئٹمز چھپائیں ▲" : `آئٹمز دیکھیں (${o.order_items?.length || 0}) ▼`}
        </button>
        {expandedOrder === o.id && o.order_items?.length > 0 && (
          <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
            {o.order_items.map((item: any) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{item.name}{item.variant_label ? ` — ${item.variant_label}` : ""} × {item.quantity}</span>
                  <span className="font-bold">Rs {item.price * item.quantity}</span>
                </div>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[11px] text-muted-foreground pr-2">
                    {item.options.map((o: any) => o.choice).join(" • ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {o.delivery_address && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
        {o.notes && <p className="text-xs text-muted-foreground">📝 {o.notes}</p>}

        <div className="pt-2">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: "confirmed", label: "✅ قبول", active: o.status === "pending", disabledReason: "" },
              { key: "preparing", label: "👨‍🍳 تیاری", active: o.status === "confirmed", disabledReason: "" },
              { key: "delivering", label: "🏍️ بھیجا", active: canSend, disabledReason: needsPlatformRider && !o.rider_id ? "پہلے ایڈمن رائیڈر اسائن کرے" : "" },
              { key: "delivered", label: "📦 پہنچا", active: restaurantCanFinish, disabledReason: o.rider_id ? "یہ کام رائیڈر کرے گا" : "" },
            ].map((step) => {
              const order = ["pending", "confirmed", "preparing", "delivering", "delivered"];
              const currentIdx = order.indexOf(o.status);
              const stepIdx = order.indexOf(step.key);
              const isDone = currentIdx >= stepIdx;
              return (
                <Button
                  key={step.key}
                  type="button"
                  variant="outline"
                  disabled={!step.active}
                  title={step.disabledReason}
                  onClick={() => updateStatus(o, step.key)}
                  className={`h-auto min-h-10 text-[11px] font-bold px-2 py-2 rounded-lg border-2 transition-all ${
                    isDone
                      ? "bg-success/20 border-success text-success"
                      : step.active
                        ? "bg-primary text-primary-foreground border-primary shadow-glow animate-pulse cursor-pointer"
                        : "bg-muted border-border text-muted-foreground opacity-60 cursor-not-allowed"
                  }`}
                >
                  {step.label}
                </Button>
              );
            })}
          </div>
          {needsPlatformRider && o.status === "preparing" && !o.rider_id && (
            <p className="text-[11px] text-muted-foreground mt-2">🏍️ رائیڈر اسائن ہوتے ہی "بھیجا" فعال ہو جائے گا۔</p>
          )}
          {o.status === "delivering" && o.rider_id && (
            <p className="text-[11px] text-primary mt-2">✅ کھانا رائیڈر کے حوالے ہو گیا — اب "Delivered" رائیڈر کرے گا۔</p>
          )}
          {o.status !== "delivering" && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive mt-2" onClick={() => updateStatus(o, "cancelled")}>
              ❌ آرڈر منسوخ کریں
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderDone = (o: any) => {
    const isOpen = expandedOrder === o.id;
    const itemsSummary = (o.order_items || []).map((i: any) => `${i.name}${i.variant_label ? ` — ${i.variant_label}` : ""} ×${i.quantity}`).join("، ");
    return (
      <div key={o.id} className="border rounded-lg bg-secondary/20">
        <button
          onClick={() => setExpandedOrder(isOpen ? null : o.id)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-right"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge className={statusColor(o.status)}>{o.status}</Badge>
            <span className="text-sm font-semibold truncate">{itemsSummary || `#${o.id.slice(0, 8)}`}</span>
          </div>
          <span className="text-sm font-extrabold text-primary shrink-0">Rs {o.total_amount}</span>
          <span className="text-xs text-muted-foreground shrink-0">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div className="px-3 pb-3 space-y-2 border-t pt-2">
            <p className="text-[11px] text-muted-foreground font-mono">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString("ur-PK")}</p>
            {o.order_items?.map((item: any) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{item.name}{item.variant_label ? ` — ${item.variant_label}` : ""} × {item.quantity}</span>
                  <span className="font-bold">Rs {item.price * item.quantity}</span>
                </div>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">{item.options.map((x: any) => x.choice).join(" • ")}</p>
                )}
              </div>
            ))}
            {o.delivery_address && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
          </div>
        )}
      </div>
    );
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
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold mb-2 flex items-center gap-2">
                🔔 نئے / جاری آرڈرز
                <Badge className="bg-primary text-primary-foreground">{activeOrders.length}</Badge>
              </h3>
              {activeOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">ابھی کوئی نیا آرڈر نہیں</p>
              ) : (
                <div className="space-y-3">{activeOrders.map(renderActive)}</div>
              )}
            </div>

            {doneOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold mb-2 flex items-center gap-2 text-muted-foreground">
                  ✅ مکمل / منسوخ شدہ
                  <Badge variant="outline">{doneOrders.length}</Badge>
                </h3>
                <div className="space-y-1.5">{doneOrders.map(renderDone)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantOwnerDashboard;
