import { useEffect, useRef, useState } from "react";
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
import ProductPhotoUploader from "@/components/media/ProductPhotoUploader";
import PhotoTips from "@/components/media/PhotoTips";
import EarningsPanel from "@/components/vendor/EarningsPanel";
import SalesReport from "@/components/vendor/SalesReport";
import RestaurantScore from "@/components/vendor/RestaurantScore";
import VendorReviewsPanel from "@/components/reviews/VendorReviewsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import { VariantsEditor, OptionGroupsEditor, sanitizeVariants, sanitizeGroups, type VariantRow, type OptionGroupRow } from "@/components/menu/MenuOptionsEditor";
import DayNavigator, { dayKey, startOfDay } from "@/components/common/DayNavigator";

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

  // Live count of orders still waiting for the owner's acceptance
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const count = async () => {
      const { data: rests } = await supabase.from("restaurants").select("id").eq("owner_id", user.id);
      const ids = (rests || []).map((r) => r.id);
      if (!ids.length) { if (!cancelled) setPendingCount(0); return; }
      const { count: n } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("restaurant_id", ids)
        .eq("status", "pending");
      if (!cancelled) setPendingCount(n || 0);
    };
    count();
    const timer = setInterval(count, 30000);
    const channel = supabase
      .channel("owner-pending-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, count)
      .subscribe();
    return () => { cancelled = true; clearInterval(timer); supabase.removeChannel(channel); };
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
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl px-3 py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold text-primary sm:text-lg">ریسٹورنٹ ڈیش بورڈ</h1>
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">لاگ آؤٹ</span>
          </Button>
        </div>
      </header>
      <div className="p-3 sm:p-6">
        <Tabs defaultValue="restaurant">
          <div className="-mx-3 mb-4 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex w-max gap-1">
              <TabsTrigger value="restaurant" className="gap-1 whitespace-nowrap text-xs"><Store className="h-4 w-4" /> میرا ریسٹورنٹ</TabsTrigger>
              <TabsTrigger value="menu" className="gap-1 whitespace-nowrap text-xs"><UtensilsCrossed className="h-4 w-4" /> مینو</TabsTrigger>
              <TabsTrigger value="orders" className="relative gap-1 whitespace-nowrap text-xs">
                <ShoppingBag className="h-4 w-4" /> آرڈرز
                {pendingCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reels" className="gap-1 whitespace-nowrap text-xs"><Clapperboard className="h-4 w-4" /> ریلز</TabsTrigger>
              <TabsTrigger value="earnings" className="gap-1 whitespace-nowrap text-xs"><Wallet className="h-4 w-4" /> آمدنی</TabsTrigger>
              <TabsTrigger value="sales" className="gap-1 whitespace-nowrap text-xs"><ShoppingBag className="h-4 w-4" /> سیل رپورٹ</TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1 whitespace-nowrap text-xs"><Store className="h-4 w-4" /> ریویوز</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="restaurant"><MyRestaurantTab /></TabsContent>
          <TabsContent value="menu"><MenuTab /></TabsContent>
          <TabsContent value="orders"><OwnerOrdersTab /></TabsContent>
          <TabsContent value="reels"><MyReelsManager /></TabsContent>
          <TabsContent value="earnings"><EarningsPanel /></TabsContent>
          <TabsContent value="sales"><SalesReport /></TabsContent>
          <TabsContent value="reviews" className="space-y-4">
            <VendorReviewsPanel kind="food" />
            <VendorReviewsPanel kind="grocery" />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
};

const MyRestaurantTab = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data: rests } = await supabase.from("restaurants").select("*").eq("owner_id", user!.id);
    setRestaurants(rests || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const deleteRestaurant = async (id: string) => {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ریسٹورنٹ حذف ہو گیا!");
    fetchAll();
  };

  const uploadBanner = async (restaurantId: string, file: File) => {
    setUploading(true);
    const ext = (file.name.split(".").pop() || "webp").toLowerCase();
    const path = `restaurants/${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { setUploading(false); toast.error("اپلوڈ ناکام: " + error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    const { error: updErr } = await supabase.from("restaurants").update({ image_url: data.publicUrl }).eq("id", restaurantId);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success("ریسٹورنٹ کی تصویر اپڈیٹ ہو گئی");
    fetchAll();
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">میرا ریسٹورنٹ</CardTitle>
        <p className="text-[11px] text-muted-foreground">نیا ریسٹورنٹ ایڈمن کی منظوری سے شامل ہوتا ہے — پارٹنر فارم بھریں۔</p>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : restaurants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">ابھی کوئی ریسٹورنٹ نہیں — ایڈمن سے منظوری کے بعد یہاں نظر آئے گا</p>
        ) : (
          <div className="grid gap-4">
            {restaurants.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row gap-4 bg-secondary/30 rounded-xl p-3 sm:p-4 border overflow-hidden">
                <div className="w-full shrink-0 space-y-1.5 sm:w-28">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name} className="h-32 w-full rounded-lg object-cover sm:h-28" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed bg-background text-[11px] text-muted-foreground sm:h-28">
                      تصویر نہیں
                    </div>
                  )}
                  <ProductPhotoUploader
                    aspect="wide"
                    label="اپنی تصویر لگائیں"
                    onDone={async (photos) => {
                      const photo = photos[0];
                      if (photo) await uploadBanner(r.id, photo.file);
                    }}
                  />
                  {uploading && <p className="text-[10px] text-muted-foreground">اپلوڈ ہو رہی ہے…</p>}
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="font-bold text-foreground break-words">{r.name}</h3>
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

                  {/* Busy / temporary pause */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground">⏳ مصروف موڈ:</span>
                    {[15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={async () => {
                          const until = new Date(Date.now() + mins * 60000).toISOString();
                          const { error } = await supabase.from("restaurants").update({ busy_until: until } as any).eq("id", r.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success(`${mins} منٹ کے لیے مصروف`); fetchAll();
                        }}
                        className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                      >
                        {mins} منٹ
                      </button>
                    ))}
                    {(r as any).busy_until && new Date((r as any).busy_until) > new Date() ? (
                      <>
                        <Badge className="bg-amber-500 text-white text-[10px]">
                          {new Date((r as any).busy_until).toLocaleTimeString("ur-PK", { hour: "2-digit", minute: "2-digit" })} تک مصروف
                        </Badge>
                        <button
                          onClick={async () => {
                            await supabase.from("restaurants").update({ busy_until: null } as any).eq("id", r.id);
                            toast.success("مصروف موڈ ختم"); fetchAll();
                          }}
                          className="text-[11px] font-semibold text-primary underline"
                        >
                          ختم کریں
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">نئے آرڈرز پر گاہک کو زیادہ وقت دکھایا جائے گا</span>
                    )}
                  </div>

                  {/* Delivery Mode */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground">🚚 ڈلیوری:</span>
                    <select
                      className="h-7 text-xs border rounded-md px-2 bg-background text-foreground w-full min-w-0 max-w-full"
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

                  {/* Who pays the delivery fee */}
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold">🎁 ڈلیوری فیس میں خود دوں گا</p>
                      <p className="text-[10px] text-muted-foreground">کسٹمر کو "فری ڈیلیوری" ملے گی، فیس آپ کی ادائیگی سے کٹے گی</p>
                    </div>
                    <button
                      type="button"
                      className={`h-7 shrink-0 rounded-full px-3 text-[11px] font-bold ${(r as any).pays_delivery_fee ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      onClick={async () => {
                        await supabase.from("restaurants").update({ pays_delivery_fee: !(r as any).pays_delivery_fee } as any).eq("id", r.id);
                        toast.success("اپڈیٹ ہو گیا"); fetchAll();
                      }}
                    >
                      {(r as any).pays_delivery_fee ? "آن" : "آف"}
                    </button>
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
  const [form, setForm] = useState({ name: "", description: "", price: "", unit: "", category: "Main", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [formVariants, setFormVariants] = useState<VariantRow[]>([]);
  const [formGroups, setFormGroups] = useState<OptionGroupRow[]>([]);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", unit: "", category: "", image_url: "" });
  const [editVariants, setEditVariants] = useState<VariantRow[]>([]);
  const [editGroups, setEditGroups] = useState<OptionGroupRow[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

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

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!selectedRest) { toast.error("پہلے ریسٹورنٹ منتخب کریں"); return null; }
    if (file.size > 5 * 1024 * 1024) { toast.error("تصویر 5MB سے کم ہونی چاہیے"); return null; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `menu/${selectedRest}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    setUploading(false);
    if (error) { toast.error("اپلوڈ ناکام: " + error.message); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    toast.success("تصویر اپلوڈ ہو گئی");
    return data.publicUrl;
  };

  // Base (main) size is stored as the first variant so customers always see it
  const buildVariants = (unit: string, price: string, extra: VariantRow[]) => {
    const rest = sanitizeVariants(extra);
    const base = unit.trim() && Number(price) > 0
      ? [{ id: "base", label: unit.trim(), price: Number(price) }]
      : [];
    if (base.length === 0 && rest.length === 0) return [];
    return [...base, ...rest];
  };

  const addItem = async () => {
    if (!form.name || !form.price) { toast.error("نام اور قیمت درکار ہے"); return; }
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: selectedRest,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category || "Main",
      image_url: form.image_url,
      variants: buildVariants(form.unit, form.price, formVariants) as any,
      option_groups: sanitizeGroups(formGroups) as any,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("آئٹم شامل ہو گئی!");
    setShowAdd(false);
    setForm({ name: "", description: "", price: "", unit: "", category: "Main", image_url: "" });
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
      unit: (((item.variants || []) as VariantRow[]).find((v) => v.id === "base")?.label) || "",
      image_url: item.image_url || "",
    });
    setEditVariants(((item.variants || []) as VariantRow[]).filter((v) => v.id !== "base"));
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
      variants: buildVariants(editForm.unit, editForm.price, editVariants) as any,
      option_groups: sanitizeGroups(editGroups) as any,
    } as any).eq("id", editItem.id);
    if (error) { toast.error(error.message); return; }
    toast.success("آئٹم اپڈیٹ ہو گئی!");
    setEditItem(null);
    fetchMenu();
  };

  const categories = Array.from(new Set(menuItems.map((m) => m.category || "Main")));
  const visibleItems = menuItems.filter((m) =>
    (catFilter === "all" || (m.category || "Main") === catFilter) &&
    (!search.trim() || (m.name || "").toLowerCase().includes(search.trim().toLowerCase()))
  );
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((m) => selected.includes(m.id));

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () =>
    setSelected(allVisibleSelected ? [] : visibleItems.map((m) => m.id));

  const bulkAvailability = async (value: boolean) => {
    if (selected.length === 0) return;
    const { error } = await supabase.from("menu_items").update({ is_available: value }).in("id", selected);
    if (error) { toast.error(error.message); return; }
    toast.success(`${selected.length} آئٹمز ${value ? "فعال" : "بند"} کر دی گئیں`);
    setSelected([]);
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
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="قیمت (Rs)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <Input placeholder="وزن / مقدار (مثلاً 1 کلو)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <p className="text-[11px] text-muted-foreground">یہی بنیادی قیمت و مقدار گاہک کو سب سے پہلے نظر آئے گی۔</p>
              <Input placeholder="کیٹگری (مثلاً Main, Drinks)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <div className="space-y-2">
                <Input placeholder="تصویر URL (اختیاری)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                <ProductPhotoUploader onDone={async (photos) => {
                  const photo = photos[0]; if (!photo) return;
                  const url = await uploadImage(photo.file);
                  if (url) setForm((prev) => ({ ...prev, image_url: url }));
                }} />
                <PhotoTips />
                {uploading && <p className="text-[11px] text-muted-foreground">اپلوڈ ہو رہی ہے...</p>}
                {form.image_url && <img src={form.image_url} alt="preview" className="w-20 h-20 rounded-lg object-cover" />}
              </div>
              <VariantsEditor value={formVariants} onChange={setFormVariants} />
              <OptionGroupsEditor value={formGroups} onChange={setFormGroups} />
              <Button className="w-full" onClick={addItem}>شامل کریں</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="آئٹم تلاش کریں..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full max-w-[220px] text-xs"
          />
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">تمام کیٹگریز</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[11px] text-muted-foreground">{visibleItems.length} آئٹمز</span>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1">
              <span className="text-[11px]">{selected.length} منتخب</span>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkAvailability(true)}>سب فعال</Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkAvailability(false)}>سب بند</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSelected([])}>منسوخ</Button>
            </div>
          )}
        </div>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="سب منتخب" />
                </TableHead>
                <TableHead>نام</TableHead>
                <TableHead>کیٹگری</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>دستیاب</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} aria-label={m.name} />
                  </TableCell>
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
              {visibleItems.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی آئٹم نہیں</TableCell></TableRow>}
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
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="قیمت (Rs)" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                <Input placeholder="وزن / مقدار (مثلاً 1 کلو)" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
              </div>
              <Input placeholder="کیٹگری" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
              <div className="space-y-2">
                <Input placeholder="تصویر URL (اختیاری)" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
                <ProductPhotoUploader onDone={async (photos) => {
                  const photo = photos[0]; if (!photo) return;
                  const url = await uploadImage(photo.file);
                  if (url) setEditForm((prev) => ({ ...prev, image_url: url }));
                }} />
                <PhotoTips />
                {uploading && <p className="text-[11px] text-muted-foreground">اپلوڈ ہو رہی ہے...</p>}
                {editForm.image_url && <img src={editForm.image_url} alt="preview" className="w-20 h-20 rounded-lg object-cover" />}
              </div>
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
  const [dateFilter, setDateFilter] = useState(false);
  const [day, setDay] = useState<Date>(startOfDay(new Date()));
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
        .limit(300);
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
          triggerAlert("نیا آرڈر آیا ہے — قبول کریں!");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Every pending order rings again after 5 minutes, until it is accepted
  const remindedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = orders.filter((o) => {
        if (o.status !== "pending") return false;
        const age = now - new Date(o.created_at).getTime();
        const last = remindedRef.current[o.id] || 0;
        return age > 5 * 60 * 1000 && now - last > 5 * 60 * 1000;
      });
      if (due.length === 0) return;
      due.forEach((o) => { remindedRef.current[o.id] = now; });
      triggerAlert(`${due.length} آرڈر ابھی تک قبول نہیں کیا گیا!`);
      toast.warning(`⏰ ${due.length} آرڈر 5 منٹ سے زیادہ سے زیرِ التوا ہے — فوراً قبول کریں`, { id: "pending-reminder" });
    };
    check();
    const timer = setInterval(check, 30 * 1000);
    return () => clearInterval(timer);
  }, [orders, triggerAlert]);

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

  const visible = dateFilter
    ? orders.filter((o) => dayKey(new Date(o.created_at)) === dayKey(day))
    : orders;
  const activeOrders = visible.filter((o) => !["delivered", "completed", "cancelled"].includes(o.status));
  const doneOrders = visible.filter((o) => ["delivered", "completed", "cancelled"].includes(o.status));
  const dayTotal = Math.round(doneOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0));

  const renderActive = (o: any) => {
    const deliveryMode = o.restaurants?.delivery_mode || "platform";
    const needsPlatformRider = deliveryMode === "platform";
    const canSend = o.status === "preparing" && (!needsPlatformRider || o.rider_id);
    const restaurantCanFinish = o.status === "delivering" && (deliveryMode === "self" || (deliveryMode === "both" && !o.rider_id));
    return (
      <div key={o.id} className="rounded-lg border p-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8)}</span>
            <span className="text-sm font-extrabold">Rs {o.total_amount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={`${statusColor(o.status)} h-5 px-1.5 text-[10px]`}>{o.status}</Badge>
            {deliveryMode === "self" && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">خود ڈلیوری</Badge>}
            {deliveryMode !== "self" && o.rider_id && <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]"><Bike className="w-3 h-3" /> رائیڈر</Badge>}
            <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</span>
          </div>
        </div>

        <button className="text-[11px] text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
          {expandedOrder === o.id ? "آئٹمز چھپائیں ▲" : `آئٹمز دیکھیں (${o.order_items?.length || 0}) ▼`}
        </button>
        {expandedOrder === o.id && o.order_items?.length > 0 && (
          <div className="space-y-0.5 rounded-md bg-secondary/30 p-2">
            {o.order_items.map((item: any) => (
              <div key={item.id} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="truncate">{item.name}{item.variant_label ? ` — ${item.variant_label}` : ""} × {item.quantity}</span>
                  <span className="shrink-0 font-bold">Rs {item.price * item.quantity}</span>
                </div>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[10px] text-muted-foreground pr-2">
                    {item.options.map((o: any) => o.choice).join(" • ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {o.delivery_address && <p className="text-[11px] text-muted-foreground line-clamp-1">📍 {o.delivery_address}</p>}
        {o.notes && <p className="text-[11px] text-muted-foreground line-clamp-1">📝 {o.notes}</p>}

        {!["delivering", "delivered", "completed", "cancelled"].includes(o.status) && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-secondary/30 px-2 py-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">⏱ تیاری کا وقت:</span>
            {[10, 20, 30].map((mins) => (
              <button
                key={mins}
                onClick={async () => {
                  const { error } = await supabase.from("orders").update({ prep_minutes: mins } as any).eq("id", o.id);
                  if (error) { toast.error(error.message); return; }
                  toast.success(`${mins} منٹ سیٹ ہو گئے`);
                  fetchOrders();
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  o.prep_minutes === mins ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                {mins} منٹ
              </button>
            ))}
          </div>
        )}

        <div className="pt-1">
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
                  className={`h-8 rounded-md border px-1.5 py-1 text-[10px] font-bold transition-all ${
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
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">آرڈرز</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDateFilter((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              dateFilter ? "bg-primary text-primary-foreground border-primary" : "border-border"
            }`}
          >
            {dateFilter ? "📅 تاریخ کے مطابق" : "سب آرڈرز"}
          </button>
          {dateFilter && <DayNavigator date={day} onChange={setDay} />}
          {dateFilter && (
            <span className="text-xs text-muted-foreground">
              {activeOrders.length + doneOrders.length} آرڈرز • Rs {dayTotal}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : visible.length === 0 ? (
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
