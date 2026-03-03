import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, ImageIcon } from "lucide-react";
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

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("grocery_stores").select("*").order("created_at", { ascending: false });
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

  const toggleStoreActive = async (id: string, current: boolean) => {
    await supabase.from("grocery_stores").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteStore = async (id: string) => {
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
                  <TableHead>تصویر / Image</TableHead>
                  <TableHead>نام / Name</TableHead>
                  <TableHead>کیٹیگری / Category</TableHead>
                  <TableHead>ڈلیوری / Delivery</TableHead>
                  <TableHead>ایکٹو / Active</TableHead>
                  <TableHead>ایکشنز / Actions</TableHead>
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
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.delivery_time}</TableCell>
                    <TableCell>
                      <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {s.is_active ? "ایکٹو" : "غیر ایکٹو"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStore(selectedStore === s.id ? null : s.id)}>
                        <Eye className="h-3 w-3 mr-1" /> پروڈکٹس
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        const url = prompt("بینر تصویر URL / Banner Image URL:", s.image_url || "");
                        if (url !== null) {
                          supabase.from("grocery_stores").update({ image_url: url || null }).eq("id", s.id).then(() => { toast.success("بینر اپڈیٹ / Banner updated"); fetchData(); });
                        }
                      }}>
                        <ImageIcon className="h-3 w-3 mr-1" /> بینر
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStoreActive(s.id, s.is_active)}>
                        {s.is_active ? "بند / Off" : "فعال / On"}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteStore(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی اسٹور نہیں / No stores</TableCell></TableRow>}
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
                  <TableHead>کیٹیگری / Category</TableHead>
                  <TableHead>یونٹ / Unit</TableHead>
                  <TableHead>دستیاب / Available</TableHead>
                  <TableHead>ایکشنز / Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>Rs {p.price}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      <Badge className={p.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {p.is_available ? "ہاں / Yes" : "نہیں / No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleProductAvailable(p.id, p.is_available)}>
                        {p.is_available ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی پروڈکٹ نہیں / No products</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroceryTab;
