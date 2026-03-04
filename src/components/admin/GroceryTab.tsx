import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, ImageIcon, Pencil, Check, X as XIcon, ArrowUp, ArrowDown, AlertTriangle, PauseCircle, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const GROCERY_CATEGORIES = [
  "General", "Fruits", "Vegetables", "Dairy", "Eggs & Meat", "Atta & Rice",
  "Beverages", "Snacks", "Bakery", "Frozen", "Cleaning", "Personal Care",
];

const GroceryTab = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "General", unit: "kg" });
  const [newStore, setNewStore] = useState({ name: "", category: "General", delivery_time: "20-30 min", image_url: "" });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductDiscount, setEditProductDiscount] = useState("");

  const saveProductPrice = async (productId: string) => {
    const updates: any = { price: Number(editProductPrice) };
    updates.discount_price = editProductDiscount ? Number(editProductDiscount) : null;
    updates.is_special_offer = !!editProductDiscount;
    const { error } = await supabase.from("grocery_products").update(updates).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    toast.success("قیمت اپڈیٹ / Price updated");
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
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteStore = async (id: string) => {
    if (!window.confirm("کیا آپ واقعی یہ اسٹور حذف کرنا چاہتے ہیں؟ تمام پروڈکٹس بھی حذف ہو جائیں گی!\n\nAre you sure? All products will also be deleted!")) return;
    await supabase.from("grocery_products").delete().eq("store_id", id);
    await supabase.from("grocery_stores").delete().eq("id", id);
    toast.success("اسٹور حذف ہو گیا / Store deleted");
    if (selectedStore === id) setSelectedStore(null);
    fetchData();
  };

  const addStore = async () => {
    if (!newStore.name.trim()) { toast.error("نام درکار ہے / Name required"); return; }
    if (!user) { toast.error("لاگ ان ضروری ہے"); return; }
    const { error } = await supabase.from("grocery_stores").insert({
      name: newStore.name,
      category: newStore.category,
      delivery_time: newStore.delivery_time,
      image_url: newStore.image_url || null,
      owner_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("اسٹور شامل ہو گیا / Store added");
    setNewStore({ name: "", category: "General", delivery_time: "20-30 min", image_url: "" });
    setShowAddStore(false);
    fetchData();
  };

  const toggleProductAvailable = async (id: string, current: boolean) => {
    await supabase.from("grocery_products").update({ is_available: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("کیا آپ واقعی یہ پروڈکٹ حذف کرنا چاہتے ہیں؟\nAre you sure you want to delete this product?")) return;
    await supabase.from("grocery_products").delete().eq("id", id);
    toast.success("پروڈکٹ حذف ہو گیا / Product deleted");
    fetchData();
  };

  const addProduct = async () => {
    if (!selectedStore || !newProduct.name.trim() || !newProduct.price) {
      toast.error("نام اور قیمت درکار ہے / Name and price required");
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
    toast.success("پروڈکٹ شامل ہو گیا / Product added");
    setNewProduct({ name: "", price: "", category: "General", unit: "kg" });
    setShowAddProduct(false);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>گروسری اسٹورز / Grocery Stores</CardTitle>
          <div className="flex gap-2">
            <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> اسٹور شامل / Add Store</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>نیا اسٹور / New Store</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="نام / Name" value={newStore.name} onChange={(e) => setNewStore({...newStore, name: e.target.value})} />
                  <div>
                    <label className="text-sm font-medium mb-1 block">کیٹیگری منتخب کریں / Select Category</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newStore.category} onChange={(e) => setNewStore({...newStore, category: e.target.value})}>
                      {GROCERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <Input placeholder="ڈلیوری ٹائم / Delivery Time" value={newStore.delivery_time} onChange={(e) => setNewStore({...newStore, delivery_time: e.target.value})} />
                  <Input placeholder="بینر تصویر URL / Banner Image URL" value={newStore.image_url} onChange={(e) => setNewStore({...newStore, image_url: e.target.value})} />
                  <Button onClick={addStore} className="w-full">شامل کریں / Add</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!activeCategory ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}
            >
              تمام / All
            </button>
            {GROCERY_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تصویر</TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead>کیٹیگری</TableHead>
                  <TableHead>فیس</TableHead>
                  <TableHead>حالت</TableHead>
                  <TableHead>ایکٹو</TableHead>
                  <TableHead>ایکشنز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((s) => (
                  <TableRow key={s.id} className={selectedStore === s.id ? "bg-accent/30" : ""}>
                    <TableCell>
                      <div className="w-14 h-10 rounded overflow-hidden bg-secondary flex items-center justify-center">
                        {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <span>{s.name}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const newName = prompt("نیا نام:", s.name);
                          if (newName && newName.trim()) {
                            supabase.from("grocery_stores").update({ name: newName.trim() }).eq("id", s.id).then(() => { toast.success("نام اپڈیٹ"); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      {s.slug && <p className="text-[10px] text-muted-foreground">/store/{s.slug}</p>}
                    </TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">Rs {s.monthly_fee || 0}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                          const fee = prompt("ماہانہ فیس سیٹ کریں (Rs):", String(s.monthly_fee || 0));
                          if (fee !== null) {
                            supabase.from("grocery_stores").update({ monthly_fee: Number(fee) || 0 }).eq("id", s.id).then(() => { toast.success("فیس اپڈیٹ"); fetchData(); });
                          }
                        }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      {s.fee_paid_until && <p className="text-[10px] text-muted-foreground">تک: {s.fee_paid_until}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        s.subscription_status === 'active' ? "bg-success text-success-foreground" :
                        s.subscription_status === 'warned' ? "bg-yellow-500 text-white" :
                        "bg-destructive text-destructive-foreground"
                      }>
                        {s.subscription_status === 'active' ? '✅ فعال' : s.subscription_status === 'warned' ? '⚠️ وارننگ' : '⏸️ معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {s.is_active ? "ایکٹو" : "بند"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStore(selectedStore === s.id ? null : s.id)}>
                          <Eye className="h-3 w-3 mr-1" /> پروڈکٹس
                        </Button>
                        {/* Subscription Actions */}
                        {s.subscription_status === 'active' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-yellow-600 border-yellow-300" onClick={() => {
                            const msg = prompt("وارننگ پیغام لکھیں:", "ادائیگی واجب الادا ہے۔ براہ کرم جلد ادائیگی کریں۔");
                            if (msg !== null) {
                              supabase.from("grocery_stores").update({ subscription_status: 'warned', warning_message: msg }).eq("id", s.id).then(() => { toast.success("وارننگ بھیج دی"); fetchData(); });
                            }
                          }}>
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> وارننگ
                          </Button>
                        )}
                        {(s.subscription_status === 'active' || s.subscription_status === 'warned') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => {
                            if (!window.confirm("کیا واقعی اسٹور معطل کرنا ہے؟ کسٹمرز کو نظر نہیں آئے گا۔")) return;
                            supabase.from("grocery_stores").update({ subscription_status: 'paused' }).eq("id", s.id).then(() => { toast.success("اسٹور معطل ہو گیا"); fetchData(); });
                          }}>
                            <PauseCircle className="h-3 w-3 mr-0.5" /> Pause
                          </Button>
                        )}
                        {(s.subscription_status === 'warned' || s.subscription_status === 'paused') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300" onClick={() => {
                            const paidUntil = prompt("ادائیگی کب تک ہے؟ (YYYY-MM-DD):", new Date(Date.now() + 30*86400000).toISOString().split("T")[0]);
                            if (paidUntil) {
                              supabase.from("grocery_stores").update({ subscription_status: 'active', warning_message: null, fee_paid_until: paidUntil }).eq("id", s.id).then(() => { toast.success("اسٹور فعال ہو گیا"); fetchData(); });
                            }
                          }}>
                            <PlayCircle className="h-3 w-3 mr-0.5" /> فعال
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStoreActive(s.id, s.is_active)}>
                          {s.is_active ? "بند" : "فعال"}
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
                {stores.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">کوئی اسٹور نہیں</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedStore && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">پروڈکٹس / Products — {stores.find(s => s.id === selectedStore)?.name}</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> پروڈکٹ شامل / Add Product</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>نئی پروڈکٹ / New Product</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="نام / Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                    <Input placeholder="قیمت / Price" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                      {GROCERY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <Input placeholder="یونٹ / Unit (kg, piece, dozen)" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                    <Button onClick={addProduct} className="w-full">شامل کریں / Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام / Name</TableHead>
                  <TableHead>قیمت / Price</TableHead>
                  <TableHead>ڈسکاؤنٹ / Discount</TableHead>
                  <TableHead>کیٹیگری / Category</TableHead>
                  <TableHead>یونٹ / Unit</TableHead>
                  <TableHead>دستیاب / Available</TableHead>
                  <TableHead>ایکشنز / Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isEditing = editingProductId === p.id;
                  return (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input type="number" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} className="h-7 w-20 text-xs" />
                      ) : (
                        <span className="font-semibold">Rs {p.price}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input type="number" value={editProductDiscount} onChange={(e) => setEditProductDiscount(e.target.value)} placeholder="خالی" className="h-7 w-20 text-xs" />
                      ) : (
                        p.discount_price ? <span className="text-destructive font-semibold">Rs {p.discount_price}</span> : <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      <Badge className={p.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {p.is_available ? "ہاں" : "نہیں"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => saveProductPrice(p.id)}>
                            <Check className="h-3 w-3 mr-0.5" /> محفوظ
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
                            <Pencil className="h-3 w-3 mr-0.5" /> قیمت
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
                {products.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">کوئی پروڈکٹ نہیں / No products</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroceryTab;
