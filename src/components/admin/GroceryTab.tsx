import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, ImageIcon, Pencil, Check, X as XIcon, ArrowUp, ArrowDown, AlertTriangle, PauseCircle, PlayCircle, Copy, MessageCircle, Link } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { useAuth } from "@/hooks/useAuth";
import BusinessLocationDialog from "./BusinessLocationDialog";

const GROCERY_CATEGORIES = [
  "General", "Fruits", "Vegetables", "Dairy", "Eggs & Meat", "Atta & Rice",
  "Beverages", "Snacks", "Bakery", "Frozen", "Cleaning", "Personal Care", "Medical & Pharmacy",
];

const GroceryTab = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<"retail" | "wholesale">("retail");
  const [page, setPage] = useState(1);
  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  useEffect(() => { setQuery(initialQuery); setPage(1); setActiveCategory(null); }, [initialQuery]);
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "General", unit: "kg" });
  const [newStore, setNewStore] = useState({ name: "", category: "General", delivery_time: "20-30 min", image_url: "", store_type: "retail", ships_nationwide: false, shop_category: "" });
  const [shopCats, setShopCats] = useState<any[]>([]);

  useEffect(() => {
    (supabase.from("wholesale_categories" as any).select("id,name,name_ur").eq("kind", "shop").eq("is_active", true).order("sort_order") as any)
      .then(({ data }: any) => setShopCats(data || []));
  }, []);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductDiscount, setEditProductDiscount] = useState("");

  const saveProductPrice = async (productId: string) => {
    const updates: any = { price: Number(editProductPrice) };
    updates.discount_price = editProductDiscount ? Number(editProductDiscount) : null;
    updates.is_special_offer = !!editProductDiscount;
    const { error } = await supabase.from("grocery_products").update(updates).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Price updated", "قیمت اپڈیٹ / Price updated"));
    setEditingProductId(null);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("grocery_stores").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (activeCategory) query = query.eq("category", activeCategory);
    const { data: storesData } = await query;
    setStores(storesData || []);
    if (selectedStore) {
      const { data: prods } = await supabase.from("grocery_products").select("*").eq("store_id", selectedStore);
      setProducts(prods || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedStore, activeCategory]);

  const moveStore = async (id: string, direction: "up" | "down") => {
    const idx = stores.findIndex(s => s.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stores.length) return;

    // Use index-based values to ensure unique sort_orders
    const newOrderA = swapIdx;
    const newOrderB = idx;

    // Optimistic UI swap
    const newStores = [...stores];
    [newStores[idx], newStores[swapIdx]] = [newStores[swapIdx], newStores[idx]];
    setStores(newStores);

    await Promise.all([
      supabase.from("grocery_stores").update({ sort_order: newOrderA }).eq("id", stores[idx].id),
      supabase.from("grocery_stores").update({ sort_order: newOrderB }).eq("id", stores[swapIdx].id),
    ]);
  };

  const toggleStoreActive = async (id: string, current: boolean) => {
    await supabase.from("grocery_stores").update({ is_active: !current }).eq("id", id);
    toast.success(tr("Updated", "اپڈیٹ ہو گیا / Updated"));
    fetchData();
  };

  const deleteStore = async (id: string) => {
    if (!window.confirm(tr("Are you sure you want to delete this store? All products will also be deleted!\n\nAre you sure? All products will also be deleted!", "کیا آپ واقعی یہ اسٹور حذف کرنا چاہتے ہیں؟ تمام پروڈکٹس بھی حذف ہو جائیں گی!\n\nAre you sure? All products will also be deleted!"))) return;
    await supabase.from("grocery_products").delete().eq("store_id", id);
    await supabase.from("grocery_stores").delete().eq("id", id);
    toast.success(tr("Store deleted", "اسٹور حذف ہو گیا / Store deleted"));
    if (selectedStore === id) setSelectedStore(null);
    fetchData();
  };

  const addStore = async () => {
    if (!newStore.name.trim()) { toast.error(tr("Name required", "نام درکار ہے / Name required")); return; }
    if (!user) { toast.error(tr("Login required", "لاگ ان ضروری ہے")); return; }
    const { error } = await supabase.from("grocery_stores").insert({
      name: newStore.name,
      category: newStore.category,
      delivery_time: newStore.delivery_time,
      image_url: newStore.image_url || null,
      owner_id: user.id,
      store_type: newStore.store_type,
      ships_nationwide: newStore.ships_nationwide,
      shop_category: newStore.store_type === "wholesale" ? (newStore.shop_category || null) : null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Store added", "اسٹور شامل ہو گیا / Store added"));
    setNewStore({ name: "", category: "General", delivery_time: "20-30 min", image_url: "", store_type: "retail", ships_nationwide: false, shop_category: "" });

    setShowAddStore(false);
    fetchData();
  };

  const toggleProductAvailable = async (id: string, current: boolean) => {
    await supabase.from("grocery_products").update({ is_available: !current }).eq("id", id);
    toast.success(tr("Updated", "اپڈیٹ ہو گیا / Updated"));
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm(tr("Are you sure you want to delete this product?\nAre you sure you want to delete this product?", "کیا آپ واقعی یہ پروڈکٹ حذف کرنا چاہتے ہیں؟\nAre you sure you want to delete this product?"))) return;
    await supabase.from("grocery_products").delete().eq("id", id);
    toast.success(tr("Product deleted", "پروڈکٹ حذف ہو گیا / Product deleted"));
    fetchData();
  };

  const addProduct = async () => {
    if (!selectedStore || !newProduct.name.trim() || !newProduct.price) {
      toast.error(tr("Name and price required", "نام اور قیمت درکار ہے / Name and price required"));
      return;
    }
    const { error } = await supabase.from("grocery_products").insert({
      store_id: selectedStore,
      name: newProduct.name,
      price: Number(newProduct.price),
      category: newProduct.category,
      unit: newProduct.unit,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Product added", "پروڈکٹ شامل ہو گیا / Product added"));
    setNewProduct({ name: "", price: "", category: "General", unit: "kg" });
    setShowAddProduct(false);
    fetchData();
  };

  const filteredStores = stores.filter(s => (kind === "wholesale" ? s.store_type === "wholesale" : s.store_type !== "wholesale")).filter(s => `${s.id} ${s.name} ${s.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const filteredProducts = products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(productQuery.trim().toLowerCase()));
  useEffect(() => { setProductPage(1); setProductQuery(""); }, [selectedStore]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <CardTitle>{kind === "wholesale" ? tr("City Bazar / Market", "سٹی بازار / مارکیٹ") : tr("Local Shops (Grocery, Medical)", "مقامی دکانیں (گروسری، میڈیکل)")}</CardTitle>
            <div className="flex gap-1 rounded-md bg-muted p-1">
              <Button size="sm" variant={kind === "retail" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setKind("retail"); setPage(1); setSelectedStore(null); }}>{tr("Local Shops", "مقامی دکانیں")} ({stores.filter(s => s.store_type !== "wholesale").length})</Button>
              <Button size="sm" variant={kind === "wholesale" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setKind("wholesale"); setPage(1); setSelectedStore(null); }}>{tr("City Bazar", "سٹی بازار")} ({stores.filter(s => s.store_type === "wholesale").length})</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {tr("Add Store", "اسٹور شامل / Add Store")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{tr("New Store", "نیا اسٹور / New Store")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder={tr("Name", "نام / Name")} value={newStore.name} onChange={(e) => setNewStore({...newStore, name: e.target.value})} />
                  <div>
                    <label className="text-sm font-medium mb-1 block">{tr("Select Category", "کیٹیگری منتخب کریں / Select Category")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newStore.category} onChange={(e) => setNewStore({...newStore, category: e.target.value})}>
                      {GROCERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <Input placeholder={tr("Delivery Time", "ڈلیوری ٹائم / Delivery Time")} value={newStore.delivery_time} onChange={(e) => setNewStore({...newStore, delivery_time: e.target.value})} />
                  <Input placeholder={tr("Banner Image URL", "بینر تصویر URL / Banner Image URL")} value={newStore.image_url} onChange={(e) => setNewStore({...newStore, image_url: e.target.value})} />
                  <div>
                    <label className="text-sm font-medium mb-1 block">{tr("Store Type", "قسم / Store Type")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newStore.store_type} onChange={(e) => setNewStore({...newStore, store_type: e.target.value})}>
                      <option value="retail">{tr("🛒 Retail (Grocery/Food)", "🛒 Retail (گروسری/Food)")}</option>
                      <option value="wholesale">{tr("📦 Wholesale (Market)", "📦 Wholesale (ہول سیل بازار)")}</option>
                    </select>
                  </div>
                  {newStore.store_type === "wholesale" && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{tr("Shop Category", "دکان کی قسم / Shop Category")}</label>
                        <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newStore.shop_category} onChange={(e) => setNewStore({...newStore, shop_category: e.target.value})}>
                          <option value="">{tr("— Select —", "— منتخب کریں —")}</option>
                          {shopCats.map((c) => <option key={c.id} value={c.name}>{c.name_ur ? `${c.name_ur} / ${c.name}` : c.name}</option>)}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newStore.ships_nationwide} onChange={(e) => setNewStore({...newStore, ships_nationwide: e.target.checked})} />
                        {tr("Ships nationwide across Pakistan (TCS/Leopards)", "پورے پاکستان میں شپنگ / Ships nationwide (TCS/Leopards)")}
                      </label>
                    </>
                  )}

                  <Button onClick={addStore} className="w-full">{tr("Add", "شامل کریں / Add")}</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={filteredStores.length} />
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!activeCategory ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}
            >
              {tr("All", "تمام / All")}
            </button>
            {GROCERY_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : (
            <Table className="admin-mobile-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Image", "تصویر")}</TableHead>
                  <TableHead>{tr("Name", "نام")}</TableHead>
                  <TableHead>{tr("Category", "کیٹیگری")}</TableHead>
                  <TableHead>{tr("Fee", "فیس")}</TableHead>
                  <TableHead>{tr("Status", "حالت")}</TableHead>
                  <TableHead>{tr("Active", "ایکٹو")}</TableHead>
                  <TableHead>{tr("Actions", "ایکشنز")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.slice((page - 1) * 20, page * 20).map((s) => (
                  <TableRow key={s.id} className={selectedStore === s.id ? "bg-accent/30" : ""}>
                    <TableCell data-label={tr("Image", "تصویر")}>
                      <div className="w-14 h-10 rounded overflow-hidden bg-secondary flex items-center justify-center">
                        {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell data-label={tr("Name", "نام")} className="font-medium">
                      <div className="flex items-center gap-1">
                        <span>{s.name}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const newName = prompt(tr("New Name:", "نیا نام:"), s.name);
                          if (newName && newName.trim()) {
                            supabase.from("grocery_stores").update({ name: newName.trim() }).eq("id", s.id).then(() => { toast.success(tr("Update Name", "نام اپڈیٹ")); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      {s.slug ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[10px] text-muted-foreground">/store/{s.slug}</p>
                          <button className="text-primary hover:text-primary/80" title={tr("Copy Link", "لنک کاپی")} onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/store/${s.slug}`);
                            toast.success(tr("Link copied!", "لنک کاپی ہو گیا!"));
                          }}>
                            <Copy className="h-3 w-3" />
                          </button>
                          <button className="text-green-600 hover:text-green-700" title={tr("Share via WhatsApp", "واٹس ایپ پر بھیجیں")} onClick={() => {
                            const storeUrl = `${window.location.origin}/store/${s.slug}`;
                            const appUrl = `${window.location.origin}/install`;
                            const msg = `🛒 *${s.name}${tr("* Store Online!\n\n📱 Store Link:", "* اسٹور آن لائن!\n\n📱 اسٹور لنک:")}
${storeUrl}

${tr("📥 Download App:", "📥 ایپ ڈاؤنلوڈ:")}
${appUrl}

${tr("Share this link with your customers!", "یہ لنک اپنے کسٹمرز کو شیئر کریں!")}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}>
                            <MessageCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button className="text-[10px] text-primary underline mt-0.5" onClick={() => {
                          const slug = prompt(tr("Set store slug (e.g. al-noor-mart):", "اسٹور کا slug سیٹ کریں (مثلاً: al-noor-mart):"));
                          if (slug) {
                            const val = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                            supabase.from("grocery_stores").update({ slug: val }).eq("id", s.id).then(({ error }) => {
                              if (error) { toast.error(error.message.includes("duplicate") ? tr("This slug is already in use", "یہ slug پہلے سے استعمال ہو رہا ہے") : error.message); return; }
                              toast.success(tr("Slug set", "Slug سیٹ ہو گیا")); fetchData();
                            });
                          }
                        }}>
                          <Link className="h-3 w-3 inline mr-0.5" />{tr("Set slug", "slug سیٹ کریں")}
                        </button>
                      )}
                    </TableCell>
                    <TableCell data-label={tr("Category", "کیٹیگری")}>
                      {s.category}
                      {s.store_type === "wholesale" && (
                        <select
                          className="mt-1 block w-full border rounded-md p-1 bg-background text-foreground text-[11px]"
                          value={s.shop_category || ""}
                          onChange={(e) => {
                            supabase.from("grocery_stores").update({ shop_category: e.target.value || null } as any).eq("id", s.id).then(({ error }) => {
                              if (error) { toast.error(error.message); return; }
                              toast.success(tr("Update Store Type", "دکان کی قسم اپڈیٹ")); fetchData();
                            });
                          }}
                        >
                          <option value="">{tr("Store Type —", "دکان کی قسم —")}</option>
                          {shopCats.map((c) => <option key={c.id} value={c.name}>{c.name_ur ? `${c.name_ur} / ${c.name}` : c.name}</option>)}
                        </select>
                      )}
                    </TableCell>

                    <TableCell data-label={tr("Fee", "فیس")}>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">Rs {s.monthly_fee || 0}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const fee = prompt(tr("Set Monthly Fee (Rs):", "ماہانہ فیس سیٹ کریں (Rs):"), String(s.monthly_fee || 0));
                          if (fee !== null) {
                            supabase.from("grocery_stores").update({ monthly_fee: Number(fee) || 0 }).eq("id", s.id).then(() => { toast.success(tr("Update Fee", "فیس اپڈیٹ")); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">{tr("Advance:", "ایڈوانس:")} {s.advance_percent || 0}%</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const pct = prompt(tr("Advance % for New Customers (0-100):", "نئے کسٹمر سے ایڈوانس فیصد (0-100):"), String(s.advance_percent || 0));
                          if (pct !== null) {
                            const val = Math.min(100, Math.max(0, Number(pct) || 0));
                            supabase.from("grocery_stores").update({ advance_percent: val } as any).eq("id", s.id).then(() => { toast.success(tr("Update Advance", "ایڈوانس اپڈیٹ")); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">{tr("Minimum Order: Rs", "کم از کم آرڈر: Rs")} {(s as any).minimum_order || 0}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const min = prompt(tr("Minimum Order Limit (Rs):", "کم از کم آرڈر لمٹ (Rs):"), String((s as any).minimum_order || 0));
                          if (min !== null) {
                            supabase.from("grocery_stores").update({ minimum_order: Number(min) || 0 } as any).eq("id", s.id).then(() => { toast.success(tr("Update Minimum Order", "کم از کم آرڈر اپڈیٹ")); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      {s.fee_paid_until && <p className="text-[10px] text-muted-foreground">{tr("To:", "تک:")} {s.fee_paid_until}</p>}
                    </TableCell>
                    <TableCell data-label={tr("Status", "حالت")}>
                      <Badge className={
                        s.subscription_status === 'active' ? "bg-success text-success-foreground" :
                        s.subscription_status === 'warned' ? "bg-yellow-500 text-white" :
                        "bg-destructive text-destructive-foreground"
                      }>
                        {s.subscription_status === 'active' ? tr("✅ Active", "✅ فعال") : s.subscription_status === 'warned' ? tr("⚠️ Warning", "⚠️ وارننگ") : tr("⏸️ Suspended", "⏸️ معطل")}
                      </Badge>
                    </TableCell>
                    <TableCell data-label={tr("Active", "ایکٹو")}>
                      <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {s.is_active ? tr("Active", "ایکٹو") : tr("Closed", "بند")}
                      </Badge>
                    </TableCell>
                    <TableCell data-label={tr("Actions", "ایکشنز")}>
                      <div className="flex gap-1 flex-wrap">
                        <BusinessLocationDialog business={s} kind="grocery" onChanged={fetchData} />
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStore(selectedStore === s.id ? null : s.id)}>
                          <Eye className="h-3 w-3 mr-1" /> {tr("Products", "پروڈکٹس")}
                        </Button>
                        {/* Subscription Actions */}
                        {s.subscription_status === 'active' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-yellow-600 border-yellow-300" onClick={() => {
                            const msg = prompt(tr("Write warning message:", "وارننگ پیغام لکھیں:"), tr("Payment is due. Please pay soon.", "ادائیگی واجب الادا ہے۔ براہ کرم جلد ادائیگی کریں۔"));
                            if (msg !== null) {
                              supabase.from("grocery_stores").update({ subscription_status: 'warned', warning_message: msg }).eq("id", s.id).then(() => { toast.success(tr("Warning sent", "وارننگ بھیج دی")); fetchData(); });
                            }
                          }}>
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> {tr("Warning", "وارننگ")}
                          </Button>
                        )}
                        {(s.subscription_status === 'active' || s.subscription_status === 'warned') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => {
                            if (!window.confirm(tr("Are you sure you want to suspend the store? It will not be visible to customers.", "کیا واقعی اسٹور معطل کرنا ہے؟ کسٹمرز کو نظر نہیں آئے گا۔"))) return;
                            supabase.from("grocery_stores").update({ subscription_status: 'paused' }).eq("id", s.id).then(() => { toast.success(tr("Store suspended", "اسٹور معطل ہو گیا")); fetchData(); });
                          }}>
                            <PauseCircle className="h-3 w-3 mr-0.5" /> Pause
                          </Button>
                        )}
                        {(s.subscription_status === 'warned' || s.subscription_status === 'paused') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300" onClick={() => {
                            const paidUntil = prompt(tr("Payment due date? (YYYY-MM-DD):", "ادائیگی کب تک ہے؟ (YYYY-MM-DD):"), new Date(Date.now() + 30*86400000).toISOString().split("T")[0]);
                            if (paidUntil) {
                              supabase.from("grocery_stores").update({ subscription_status: 'active', warning_message: null, fee_paid_until: paidUntil }).eq("id", s.id).then(() => { toast.success(tr("Store activated", "اسٹور فعال ہو گیا")); fetchData(); });
                            }
                          }}>
                            <PlayCircle className="h-3 w-3 mr-0.5" /> {tr("Active", "فعال")}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStoreActive(s.id, s.is_active)}>
                          {s.is_active ? tr("Closed", "بند") : tr("Active", "فعال")}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveStore(s.id, "up")} disabled={stores.indexOf(s) === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveStore(s.id, "down")} disabled={stores.indexOf(s) === stores.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteStore(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && <TableRow><TableCell data-label={tr("Image", "تصویر")} colSpan={7} className="text-center text-muted-foreground">{tr("No store", "کوئی اسٹور نہیں")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
          <AdminPagination page={page} count={filteredStores.length} onPage={setPage} />
        </CardContent>
      </Card>

      {selectedStore && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{tr("Products —", "پروڈکٹس / Products —")} {stores.find(s => s.id === selectedStore)?.name}</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {tr("Add Product", "پروڈکٹ شامل / Add Product")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{tr("New Product", "نئی پروڈکٹ / New Product")}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder={tr("Name", "نام / Name")} value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                    <Input placeholder={tr("Price", "قیمت / Price")} type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                      {GROCERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <Input placeholder={tr("Unit (kg, piece, dozen)", "یونٹ / Unit (kg, piece, dozen)")} value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                    <Button onClick={addProduct} className="w-full">{tr("Add", "شامل کریں / Add")}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <AdminListTools query={productQuery} onQuery={v => { setProductQuery(v); setProductPage(1); }} count={filteredProducts.length} />
            <Table className="admin-mobile-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Name", "نام / Name")}</TableHead>
                  <TableHead>{tr("Price", "قیمت / Price")}</TableHead>
                  <TableHead>{tr("Discount", "ڈسکاؤنٹ / Discount")}</TableHead>
                  <TableHead>{tr("Category", "کیٹیگری / Category")}</TableHead>
                  <TableHead>{tr("Unit", "یونٹ / Unit")}</TableHead>
                  <TableHead>{tr("Available", "دستیاب / Available")}</TableHead>
                  <TableHead>{tr("Actions", "ایکشنز / Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.slice((productPage - 1) * 20, productPage * 20).map((p) => {
                  const isEditing = editingProductId === p.id;
                  return (
                  <TableRow key={p.id}>
                    <TableCell data-label={tr("Name", "نام / Name")}>{p.name}</TableCell>
                    <TableCell data-label={tr("Price", "قیمت / Price")}>
                      {isEditing ? (
                        <Input type="number" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} className="h-7 w-20 text-xs" />
                      ) : (
                        <span className="font-semibold">Rs {p.price}</span>
                      )}
                    </TableCell>
                    <TableCell data-label={tr("Discount", "ڈسکاؤنٹ / Discount")}>
                      {isEditing ? (
                        <Input type="number" value={editProductDiscount} onChange={(e) => setEditProductDiscount(e.target.value)} placeholder={tr("Empty", "خالی")} className="h-7 w-20 text-xs" />
                      ) : (
                        p.discount_price ? <span className="text-destructive font-semibold">Rs {p.discount_price}</span> : <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell data-label={tr("Category", "کیٹیگری / Category")}>{p.category}</TableCell>
                    <TableCell data-label={tr("Unit", "یونٹ / Unit")}>{p.unit}</TableCell>
                    <TableCell data-label={tr("Available", "دستیاب / Available")}>
                      <Badge className={p.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {p.is_available ? tr("Yes", "ہاں") : tr("No", "نہیں")}
                      </Badge>
                    </TableCell>
                    <TableCell data-label={tr("Actions", "ایکشنز / Actions")} className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => saveProductPrice(p.id)}>
                            <Check className="h-3 w-3 mr-0.5" /> {tr("Saved", "محفوظ")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingProductId(null)}>
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            setEditingProductId(p.id);
                            setEditProductPrice(String(p.price));
                            setEditProductDiscount(p.discount_price ? String(p.discount_price) : "");
                          }}>
                            <Pencil className="h-3 w-3 mr-0.5" /> {tr("Price", "قیمت")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleProductAvailable(p.id, p.is_available)}>
                            {p.is_available ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
                {products.length === 0 && <TableRow><TableCell data-label={tr("Name", "نام / Name")} colSpan={7} className="text-center text-muted-foreground">{tr("No products", "کوئی پروڈکٹ نہیں / No products")}</TableCell></TableRow>}
              </TableBody>
            </Table>
            <AdminPagination page={productPage} count={filteredProducts.length} onPage={setProductPage} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroceryTab;
