import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const GroceryTab = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "General", unit: "kg" });

  const fetchData = async () => {
    setLoading(true);
    const { data: storesData } = await supabase.from("grocery_stores").select("*").order("created_at", { ascending: false });
    setStores(storesData || []);
    if (selectedStore) {
      const { data: prods } = await supabase.from("grocery_products").select("*").eq("store_id", selectedStore);
      setProducts(prods || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedStore]);

  const toggleStoreActive = async (id: string, current: boolean) => {
    await supabase.from("grocery_stores").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetchData();
  };

  const deleteStore = async (id: string) => {
    await supabase.from("grocery_stores").delete().eq("id", id);
    toast.success("اسٹور حذف ہو گیا");
    if (selectedStore === id) setSelectedStore(null);
    fetchData();
  };

  const toggleProductAvailable = async (id: string, current: boolean) => {
    await supabase.from("grocery_products").update({ is_available: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("grocery_products").delete().eq("id", id);
    toast.success("پروڈکٹ حذف ہو گیا");
    fetchData();
  };

  const addProduct = async () => {
    if (!selectedStore || !newProduct.name.trim() || !newProduct.price) {
      toast.error("نام اور قیمت درکار ہے");
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
    toast.success("پروڈکٹ شامل ہو گیا");
    setNewProduct({ name: "", price: "", category: "General", unit: "kg" });
    setShowAddProduct(false);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>گروسری اسٹورز</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>کیٹیگری</TableHead>
                  <TableHead>ریٹنگ</TableHead>
                  <TableHead>ڈلیوری</TableHead>
                  <TableHead>ایکٹو</TableHead>
                  <TableHead>ایکشنز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((s) => (
                  <TableRow key={s.id} className={selectedStore === s.id ? "bg-accent/30" : ""}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.rating}</TableCell>
                    <TableCell>{s.delivery_time}</TableCell>
                    <TableCell>
                      <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {s.is_active ? "ایکٹو" : "غیر ایکٹو"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStore(selectedStore === s.id ? null : s.id)}>
                        <Eye className="h-3 w-3 mr-1" /> پروڈکٹس
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStoreActive(s.id, s.is_active)}>
                        {s.is_active ? "بند" : "فعال"}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteStore(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی اسٹور نہیں</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedStore && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">پروڈکٹس — {stores.find(s => s.id === selectedStore)?.name}</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> پروڈکٹ شامل</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>نئی پروڈکٹ</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="نام" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                    <Input placeholder="قیمت" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <Input placeholder="کیٹیگری" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                    <Input placeholder="یونٹ (kg, piece, dozen)" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                    <Button onClick={addProduct} className="w-full">شامل کریں</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>کیٹیگری</TableHead>
                  <TableHead>یونٹ</TableHead>
                  <TableHead>دستیاب</TableHead>
                  <TableHead>ایکشنز</TableHead>
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
                        {p.is_available ? "ہاں" : "نہیں"}
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
                {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی پروڈکٹ نہیں</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroceryTab;
