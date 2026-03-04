import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Minus, ShoppingBasket, Star, Clock, Percent, Pencil, Check, X, Trash2, ArrowUp, ArrowDown, Camera } from "lucide-react";
import StoreBanner from "@/components/grocery/StoreBanner";
import PhotoListOrder from "@/components/grocery/PhotoListOrder";
import CustomerListOrders from "@/components/grocery/CustomerListOrders";
import ShopkeeperListOrders from "@/components/grocery/ShopkeeperListOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";
import { toast } from "sonner";

const GROCERY_CATEGORIES = [
  "General", "Fruits", "Vegetables", "Dairy", "Eggs & Meat", "Atta & Rice",
  "Beverages", "Snacks", "Bakery", "Frozen", "Cleaning", "Personal Care",
];

const GroceryStoreDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: cartItems, addItem, updateQuantity } = useCart();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "General", unit: "kg", discount_price: "", image_url: "" });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: storeData }, { data: productsData }] = await Promise.all([
      supabase.from("grocery_stores").select("*").eq("id", id).single(),
      supabase.from("grocery_products").select("*").eq("store_id", id).order("sort_order").order("category"),
    ]);
    setStore(storeData);
    // Owner sees all products, customers see only available
    const visibleProducts = (storeData && user && storeData.owner_id === user.id)
      ? (productsData || [])
      : (productsData || []).filter((p: any) => p.is_available);
    setProducts(visibleProducts);
    if (storeData && user) {
      setIsOwner(storeData.owner_id === user.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id, user]);

  const categories = ["All", "🔥 Special Offers", ...Array.from(new Set(products.map((p) => p.category || "General")))];
  const filtered = activeCategory === "All" ? products : activeCategory === "🔥 Special Offers" ? products.filter((p) => p.is_special_offer) : products.filter((p) => p.category === activeCategory);

  const getCartQty = (productId: string) => {
    const item = cartItems.find((i) => i.id === productId);
    return item?.quantity || 0;
  };

  const handleAdd = (product: any) => {
    const effectivePrice = product.discount_price || product.price;
    addItem({
      id: product.id,
      name: product.name,
      restaurant: store?.name || "Grocery",
      price: effectivePrice,
      image: product.image_url || "",
    });
  };

  // Owner functions
  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditPrice(String(product.price));
    setEditDiscount(product.discount_price ? String(product.discount_price) : "");
  };

  const savePrice = async (productId: string) => {
    const updates: any = { price: Number(editPrice) };
    updates.discount_price = editDiscount ? Number(editDiscount) : null;
    updates.is_special_offer = !!editDiscount;
    const { error } = await supabase.from("grocery_products").update(updates).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    toast.success("قیمت اپڈیٹ ہو گئی / Price updated");
    setEditingId(null);
    fetchData();
  };

  const toggleAvailable = async (productId: string, current: boolean) => {
    await supabase.from("grocery_products").update({ is_available: !current }).eq("id", productId);
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm("کیا آپ واقعی حذف کرنا چاہتے ہیں؟\nAre you sure?")) return;
    await supabase.from("grocery_products").delete().eq("id", productId);
    toast.success("پروڈکٹ حذف / Product deleted");
    fetchData();
  };

  const moveProduct = async (productId: string, direction: "up" | "down") => {
    const idx = products.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= products.length) return;
    const a = products[idx];
    const b = products[swapIdx];
    await Promise.all([
      supabase.from("grocery_products").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("grocery_products").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchData();
  };

  const uploadProductImage = async (productId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `products/${productId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    await supabase.from("grocery_products").update({ image_url: urlData.publicUrl }).eq("id", productId);
    toast.success("تصویر اپڈیٹ / Image updated");
    fetchData();
  };

  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price) { toast.error("نام اور قیمت درکار / Name & price required"); return; }
    const { error } = await supabase.from("grocery_products").insert({
      store_id: id,
      name: newProduct.name,
      price: Number(newProduct.price),
      category: newProduct.category,
      unit: newProduct.unit,
      discount_price: newProduct.discount_price ? Number(newProduct.discount_price) : null,
      is_special_offer: !!newProduct.discount_price,
      image_url: newProduct.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("پروڈکٹ شامل / Product added");
    setNewProduct({ name: "", price: "", category: "General", unit: "kg", discount_price: "", image_url: "" });
    setShowAddProduct(false);
    fetchData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">اسٹور نہیں ملا</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Store Header */}
      <StoreBanner
        store={store}
        isOwner={isOwner}
        storeId={id!}
        onRefresh={fetchData}
        categories={GROCERY_CATEGORIES}
        showAddProduct={showAddProduct}
        setShowAddProduct={setShowAddProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        addProduct={addProduct}
        onNavigateBack={() => navigate("/grocery")}
      />

      {/* Category Chips */}
      <div className="px-4 pt-3 pb-3 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {/* Photo List Order Section */}
      <div className="container mx-auto px-4 pb-3">
        {isOwner ? (
          <ShopkeeperListOrders storeId={id!} />
        ) : (
          <>
            <PhotoListOrder storeId={id!} storeName={store.name} />
            <div className="mt-3">
              <CustomerListOrders storeId={id!} />
            </div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 pb-6">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">اس کیٹیگری میں کوئی پروڈکٹ نہیں</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => {
              const qty = getCartQty(product.id);
              const isEditing = editingId === product.id;
              return (
                <div key={product.id} className={`bg-card rounded-2xl border overflow-hidden relative ${!product.is_available && isOwner ? 'opacity-60' : ''}`}>
                  {product.is_special_offer && product.discount_price && product.price > product.discount_price && (
                    <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Percent className="w-3 h-3" /> {Math.round(((product.price - product.discount_price) / product.price) * 100)}% آفر
                    </div>
                  )}
                  {isOwner && !product.is_available && (
                    <div className="absolute top-2 right-2 z-10 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      غیر فعال / Hidden
                    </div>
                  )}
                  <div className="h-28 bg-secondary flex items-center justify-center overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBasket className="w-10 h-10 text-muted-foreground/30" />
                    )}
                    {isOwner && (
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <label className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md" title="کیمرہ / Camera">
                          <Camera className="w-3.5 h-3.5" />
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadProductImage(product.id, file);
                          }} />
                        </label>
                        <label className="w-7 h-7 rounded-full bg-accent text-foreground flex items-center justify-center cursor-pointer shadow-md" title="گیلری / Gallery">
                          <Plus className="w-3.5 h-3.5" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadProductImage(product.id, file);
                          }} />
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                    {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}

                    {/* Price Edit Mode for Owner */}
                    {isEditing ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground w-12">قیمت:</span>
                          <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground w-12">ڈسکاؤنٹ:</span>
                          <Input type="number" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} placeholder="خالی = بغیر ڈسکاؤنٹ" className="h-7 text-xs" />
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs flex-1" onClick={() => savePrice(product.id)}>
                            <Check className="w-3 h-3 mr-0.5" /> محفوظ / Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          {product.discount_price ? (
                            <>
                              <span className="text-sm font-extrabold text-destructive">Rs {product.discount_price}</span>
                              <span className="text-xs text-muted-foreground line-through ml-1">Rs {product.price}</span>
                            </>
                          ) : (
                            <span className="text-sm font-extrabold text-primary">Rs {product.price}</span>
                          )}
                          {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
                        </div>
                        {isOwner ? (
                          <div className="flex gap-0.5 flex-wrap">
                            <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => moveProduct(product.id, "up")} title="اوپر / Move Up">
                              <ArrowUp className="w-3 h-3 text-foreground" />
                            </button>
                            <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => moveProduct(product.id, "down")} title="نیچے / Move Down">
                              <ArrowDown className="w-3 h-3 text-foreground" />
                            </button>
                            <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => startEdit(product)}>
                              <Pencil className="w-3 h-3 text-foreground" />
                            </button>
                            <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => toggleAvailable(product.id, product.is_available)}>
                              {product.is_available ? <X className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-primary" />}
                            </button>
                            <button className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center" onClick={() => deleteProduct(product.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        ) : qty === 0 ? (
                          <Button size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => handleAdd(product)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" onClick={() => updateQuantity(product.id, qty - 1)}>
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{qty}</span>
                            <button className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" onClick={() => handleAdd(product)}>
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default GroceryStoreDetail;
