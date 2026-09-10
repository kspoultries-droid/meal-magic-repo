import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Minus, ShoppingBasket, Star, Clock, Percent, Pencil, Check, X, Trash2, ArrowUp, ArrowDown, Camera, Share2, AlertTriangle, PauseCircle } from "lucide-react";
import StoreBanner from "@/components/grocery/StoreBanner";
import ProductPhotoUploader, { PreparedPhoto } from "@/components/media/ProductPhotoUploader";

import PhotoListOrder from "@/components/grocery/PhotoListOrder";
import CustomerListOrders from "@/components/grocery/CustomerListOrders";
import ShopkeeperListOrders from "@/components/grocery/ShopkeeperListOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const GROCERY_CATEGORIES = [
  "General", "Fruits", "Vegetables", "Dairy", "Eggs & Meat", "Atta & Rice",
  "Beverages", "Snacks", "Bakery", "Frozen", "Cleaning", "Personal Care",
];

const StandaloneStore = () => {
  const { slug } = useParams();
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
    const { data: storeData } = await supabase
      .from("grocery_stores")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!storeData) {
      setStore(null);
      setLoading(false);
      return;
    }

    const { data: productsData } = await supabase
      .from("grocery_products")
      .select("*")
      .eq("store_id", storeData.id)
      .order("sort_order")
      .order("category");

    setStore(storeData);
    const ownerCheck = storeData && user && storeData.owner_id === user.id;
    const visibleProducts = ownerCheck
      ? (productsData || [])
      : (productsData || []).filter((p: any) => p.is_available);
    setProducts(visibleProducts);
    setIsOwner(!!ownerCheck);
    setLoading(false);
  };

  useEffect(() => {
    if (slug) fetchData();
  }, [slug, user]);

  const categories = ["All", "🔥 Special Offers", ...Array.from(new Set(products.map((p) => p.category || "General")))];
  const filtered = activeCategory === "All" ? products : activeCategory === "🔥 Special Offers" ? products.filter((p) => p.is_special_offer) : products.filter((p) => p.category === activeCategory);

  const getCartLine = (productId: string) =>
    cartItems.find((i) => i.menu_item_id === productId || i.id === productId);

  const handleAdd = (product: any) => {
    const effectivePrice = product.discount_price || product.price;
    addItem({
      id: product.id,
      name: product.name,
      restaurant: store?.name || "Grocery",
      price: effectivePrice,
      image: product.image_url || "",
      source: "grocery",
      sourceId: store?.id,
    });
  };

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
    toast.success("قیمت اپڈیٹ ہو گئی");
    setEditingId(null);
    fetchData();
  };

  const toggleAvailable = async (productId: string, current: boolean) => {
    await supabase.from("grocery_products").update({ is_available: !current }).eq("id", productId);
    toast.success("اپڈیٹ ہو گیا");
    fetchData();
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm("کیا آپ واقعی حذف کرنا چاہتے ہیں؟")) return;
    await supabase.from("grocery_products").delete().eq("id", productId);
    toast.success("پروڈکٹ حذف ہو گئی");
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

  const uploadProductImage = async (productId: string, photo: PreparedPhoto) => {
    const path = `products/${productId}-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, photo.file, { upsert: true, contentType: photo.file.type });
    if (uploadError) { toast.error(uploadError.message); return; }
    const originalExt = photo.original.name.split(".").pop()?.toLowerCase() || "jpg";
    await supabase.storage.from("product-images").upload(`originals/${productId}-${Date.now()}.${originalExt}`, photo.original, { upsert: true });
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    await supabase.from("grocery_products").update({ image_url: urlData.publicUrl }).eq("id", productId);
    toast.success("تصویر اپڈیٹ ہو گئی");
    fetchData();
  };


  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price) { toast.error("نام اور قیمت درکار ہے"); return; }
    const { error } = await supabase.from("grocery_products").insert({
      store_id: store.id,
      name: newProduct.name,
      price: Number(newProduct.price),
      category: newProduct.category,
      unit: newProduct.unit,
      discount_price: newProduct.discount_price ? Number(newProduct.discount_price) : null,
      is_special_offer: !!newProduct.discount_price,
      image_url: newProduct.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("پروڈکٹ شامل ہو گئی");
    setNewProduct({ name: "", price: "", category: "General", unit: "kg", discount_price: "", image_url: "" });
    setShowAddProduct(false);
    fetchData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-center px-4">
    <div>
      <ShoppingBasket className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
      <p className="text-lg font-bold">اسٹور نہیں ملا</p>
      <p className="text-sm mt-1">یہ لنک غلط ہے یا اسٹور ابھی فعال نہیں ہے</p>
    </div>
  </div>;

  // Paused store - show message to customers, owner can still see
  if (store.subscription_status === 'paused' && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <PauseCircle className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-bold text-foreground">یہ اسٹور عارضی طور پر بند ہے</p>
          <p className="text-sm text-muted-foreground mt-2">براہ کرم بعد میں دوبارہ کوشش کریں</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Store Header - no back navigation to grocery list */}
      <StoreBanner
        store={store}
        isOwner={isOwner}
        storeId={store.id}
        onRefresh={fetchData}
        categories={GROCERY_CATEGORIES}
        showAddProduct={showAddProduct}
        setShowAddProduct={setShowAddProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        addProduct={addProduct}
        onNavigateBack={() => {}} // No back in standalone mode
      />

      {/* Warning/Pause Banner for Owner */}
      {isOwner && (store.subscription_status === 'warned' || store.subscription_status === 'paused') && (
        <div className={`mx-4 mt-3 p-3 rounded-xl flex items-start gap-2 ${
          store.subscription_status === 'paused' ? 'bg-destructive/10 border border-destructive/30' : 'bg-yellow-50 border border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
        }`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${store.subscription_status === 'paused' ? 'text-destructive' : 'text-yellow-600'}`} />
          <div>
            <p className={`text-sm font-bold ${store.subscription_status === 'paused' ? 'text-destructive' : 'text-yellow-700 dark:text-yellow-400'}`}>
              {store.subscription_status === 'paused' ? '⏸️ آپ کا اسٹور معطل ہے — کسٹمرز کو نظر نہیں آ رہا' : '⚠️ وارننگ'}
            </p>
            {store.warning_message && (
              <p className="text-xs text-muted-foreground mt-1">{store.warning_message}</p>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Share Button for Owner */}
      {isOwner && (
        <div className="px-4 pt-3">
          <Button
            className="w-full h-10 text-sm font-bold gap-2"
            style={{ backgroundColor: "#25D366" }}
            onClick={() => {
              const storeUrl = `${window.location.origin}/store/${slug}`;
              const msg = `السلام علیکم! 🛒\nہماری دکان "${store.name}" پر آرڈر کریں:\n${storeUrl}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
            }}
          >
            <Share2 className="w-4 h-4" />
            واٹس ایپ پر لنک شیئر کریں / Share on WhatsApp
          </Button>
        </div>
      )}

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

      {/* Tabs: Products & Orders */}
      <div className="container mx-auto px-4 pb-6">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="products" className="flex-1">🛒 پروڈکٹس</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">📋 آرڈرز</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">اس کیٹیگری میں کوئی پروڈکٹ نہیں</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((product) => {
                  const cartLine = getCartLine(product.id);
                  const qty = cartLine?.quantity || 0;
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
                          غیر فعال
                        </div>
                      )}
                        <div
                          className="h-28 bg-secondary flex items-center justify-center overflow-hidden relative cursor-pointer"
                          onClick={() => { if (!isOwner) navigate(`/product/${product.id}`); }}
                        >
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBasket className="w-10 h-10 text-muted-foreground/30" />
                          )}
                          {!isOwner && product.rating > 0 && <span className="absolute bottom-1 left-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-[9px] font-bold text-background">★ {Number(product.rating).toFixed(1)}</span>}
                        {isOwner && (
                          <div className="absolute bottom-1 right-1 flex gap-1">
                            <ProductPhotoUploader compact onDone={async (photos) => { if (photos[0]) await uploadProductImage(product.id, photos[0]); }} />
                          </div>
                        )}

                      </div>
                       <div className="p-3">
                         <button type="button" className="block max-w-full text-left" onClick={() => !isOwner && navigate(`/product/${product.id}`)}>
                           <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                           {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
                         </button>

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
                                <Check className="w-3 h-3 mr-0.5" /> محفوظ
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
                                <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => moveProduct(product.id, "up")}>
                                  <ArrowUp className="w-3 h-3 text-foreground" />
                                </button>
                                <button className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" onClick={() => moveProduct(product.id, "down")}>
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
                                <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" onClick={() => cartLine && updateQuantity(cartLine.id, qty - 1)}>
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
          </TabsContent>

          <TabsContent value="orders">
            {isOwner ? (
              <ShopkeeperListOrders storeId={store.id} />
            ) : (
              <div className="space-y-2">
                <PhotoListOrder storeId={store.id} storeName={store.name} />
                <CustomerListOrders storeId={store.id} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart Drawer only - NO Navbar, NO BottomTabBar */}
    </div>
  );
};

export default StandaloneStore;
