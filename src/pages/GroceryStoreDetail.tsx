import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Minus, ShoppingBasket, Star, Clock, Percent, Pencil, Check, X, Trash2, ArrowUp, ArrowDown, Camera } from "lucide-react";
import StoreBanner from "@/components/grocery/StoreBanner";
import PhotoListOrder from "@/components/grocery/PhotoListOrder";
import CustomerListOrders from "@/components/grocery/CustomerListOrders";
import ShopkeeperListOrders from "@/components/grocery/ShopkeeperListOrders";
import ShopkeeperCartOrders from "@/components/grocery/ShopkeeperCartOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyReelsManager from "@/components/reels/MyReelsManager";
import ProductPhotoUploader, { PreparedPhoto } from "@/components/media/ProductPhotoUploader";

import BottomTabBar from "@/components/BottomTabBar";
import { toast } from "sonner";

const GROCERY_CATEGORIES = [
  "General", "Fruits", "Vegetables", "Dairy", "Eggs & Meat", "Atta & Rice",
  "Beverages", "Snacks", "Bakery", "Frozen", "Cleaning", "Personal Care",
];

const GroceryStoreDetail = () => {
  const { id } = useParams();
  const isBazar = useLocation().pathname.startsWith("/bazar");
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
  const [editDescription, setEditDescription] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

   const [showAddProduct, setShowAddProduct] = useState(false);
   const [newProduct, setNewProduct] = useState({
     name: "", price: "", category: "General", unit: "piece", discount_price: "", description: "", image_url: "", imageFiles: [] as File[],
     brand: "", sku: "", weight: "", weight_kg: "", shipping_class: "standard", dimensions: "", material: "", voltage: "", screen_size: "", ram: "", storage: "", stock_qty: "", tags: "", colors: "", sizes: "",
   });

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

  const getVariants = (product: any) =>
    Array.isArray(product.variants) ? product.variants.filter((variant: any) => variant && (variant.label || variant.name)) : [];

  const variantKey = (variant: any, index: number) => String(variant.id || variant.label || variant.name || index);

  const getCartLine = (productId: string, variantId?: string | null) =>
    cartItems.find((item) => item.menu_item_id === productId && (item.variant_id || null) === (variantId || null));

  const handleAdd = (product: any) => {
    const effectivePrice = product.wholesale_price || product.discount_price || product.price;
    const variants = getVariants(product);
    const selectedKey = selectedVariants[product.id];
    const variant = variants.find((value: any, index: number) => variantKey(value, index) === selectedKey) || variants[0];
    const variantLabel = variant?.label || variant?.name;
    addItem({
      id: product.id,
      name: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
      restaurant: store?.name || "Grocery",
      price: effectivePrice + Number(variant?.price_delta || 0),
      image: product.image_url || "",
      source: "grocery",
      sourceId: id,
      weight_kg: product.weight_kg,
      weight: product.weight,
      variant_id: variant?.id || variantLabel || null,
      variant_label: variantLabel || null,
    });
  };


  // Owner functions
  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditPrice(String(product.price));
    setEditDiscount(product.discount_price ? String(product.discount_price) : "");
    setEditDescription(product.description || "");
  };

  const savePrice = async (productId: string) => {
    const updates: any = { price: Number(editPrice) };
    updates.discount_price = editDiscount ? Number(editDiscount) : null;
    updates.is_special_offer = !!editDiscount;
    updates.description = editDescription.trim() || null;
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

  const uploadProductImage = async (productId: string, photo: PreparedPhoto) => {
    const path = `products/${productId}-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, photo.file, { upsert: true, contentType: photo.file.type });
    if (uploadError) { toast.error(uploadError.message); return; }
    const originalExt = photo.original.name.split(".").pop()?.toLowerCase() || "jpg";
    await supabase.storage.from("product-images").upload(`originals/${productId}-${Date.now()}.${originalExt}`, photo.original, { upsert: true });
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    await supabase.from("grocery_products").update({ image_url: urlData.publicUrl }).eq("id", productId);
    toast.success("تصویر اپڈیٹ / Image updated");
    fetchData();
  };


   const addProduct = async () => {
     if (!newProduct.name.trim() || !newProduct.price) { toast.error("نام اور قیمت درکار / Name & price required"); return; }
     const sizes = newProduct.sizes.split(",").map((value) => value.trim()).filter(Boolean);
     const colors = newProduct.colors.split(",").map((value) => value.trim()).filter(Boolean);
     const variants = [...sizes, ...colors].map((label, index) => ({ id: `${index + 1}`, label, size: sizes.includes(label) ? label : undefined, color: colors.includes(label) ? label : undefined }));
     const specs = Object.fromEntries(Object.entries({ برانڈ: newProduct.brand, SKU: newProduct.sku, وزن: newProduct.weight, پیمائش: newProduct.dimensions, مواد: newProduct.material, وولٹیج: newProduct.voltage, "اسکرین سائز": newProduct.screen_size, RAM: newProduct.ram, اسٹوریج: newProduct.storage }).filter(([, value]) => value.trim()));
      const { data: createdProduct, error } = await supabase.from("grocery_products").insert({
        store_id: id, name: newProduct.name.trim(), price: Number(newProduct.price), category: newProduct.category, unit: newProduct.unit || null,
        discount_price: newProduct.discount_price ? Number(newProduct.discount_price) : null, is_special_offer: !!newProduct.discount_price,
        description: newProduct.description?.trim() || null, image_url: newProduct.image_url || null, brand: newProduct.brand.trim() || null,
        sku: newProduct.sku.trim() || null, weight: newProduct.weight.trim() || null, weight_kg: newProduct.weight_kg ? Number(newProduct.weight_kg) : null,
        shipping_class: newProduct.shipping_class || "standard", stock_qty: newProduct.stock_qty ? Number(newProduct.stock_qty) : null,
        tags: newProduct.tags.split(",").map((value) => value.trim()).filter(Boolean), variants, specs,
      }).select("id").single();
     if (error || !createdProduct) { toast.error(error?.message || "پروڈکٹ شامل نہیں ہو سکی"); return; }
     const imageUrls = await Promise.all((newProduct.imageFiles || []).map(async (file, index) => {
       const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"; const path = `products/${createdProduct.id}-${index}-${Date.now()}.${ext}`;
       const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file); if (uploadError) return null;
       return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
     }));
     const validImages = imageUrls.filter((url): url is string => Boolean(url));
     if (validImages.length > 0) { const { error: imageError } = await supabase.from("grocery_products").update({ image_url: newProduct.image_url || validImages[0], images: validImages }).eq("id", createdProduct.id); if (imageError) toast.error(imageError.message); }
     toast.success("پروڈکٹ شامل / Product added");
     setNewProduct({ name: "", price: "", category: "General", unit: "piece", discount_price: "", description: "", image_url: "", imageFiles: [], brand: "", sku: "", weight: "", weight_kg: "", shipping_class: "standard", dimensions: "", material: "", voltage: "", screen_size: "", ram: "", storage: "", stock_qty: "", tags: "", colors: "", sizes: "" });
     setShowAddProduct(false); fetchData();
   };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">اسٹور نہیں ملا</div>;

  const minimumOrder = (store as any)?.minimum_order || 0;
  const storeCartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Minimum Order Notice */}
      {minimumOrder > 0 && !isOwner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-center">
          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
            ⚠️ کم از کم آرڈر: Rs {minimumOrder} | Minimum Order: Rs {minimumOrder}
          </p>
        </div>
      )}
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

      {/* Category Chips - Sticky */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-3 overflow-x-auto shadow-sm">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 scale-105"
                  : "bg-secondary/70 text-foreground hover:bg-secondary"
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
            {(!isBazar || isOwner) && (
              <TabsTrigger value="orders" className="flex-1">📋 آرڈرز</TabsTrigger>
            )}
            {isOwner && <TabsTrigger value="reels" className="flex-1">🎬 ریلز</TabsTrigger>}
          </TabsList>


          <TabsContent value="products">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">اس کیٹیگری میں کوئی پروڈکٹ نہیں</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-3">
                {filtered.map((product, idx) => {
                  const productVariants = getVariants(product);
                  const selectedKey = selectedVariants[product.id] || (productVariants[0] ? variantKey(productVariants[0], 0) : null);
                  const selectedVariant = productVariants.find((variant: any, index: number) => variantKey(variant, index) === selectedKey);
                  const cartLine = getCartLine(product.id, selectedVariant?.id || selectedVariant?.label || null);
                  const qty = cartLine?.quantity || 0;
                  const isEditing = editingId === product.id;
                  return (
                    <div
                      key={product.id}
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      className={`bg-card rounded-2xl border border-border/60 overflow-hidden relative shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in ${!product.is_available && isOwner ? 'opacity-60' : ''}`}
                    >
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
                       <div
                         className="h-28 bg-secondary flex items-center justify-center overflow-hidden relative cursor-pointer"
                         onClick={() => !isOwner && navigate(`/product/${product.id}`)}
                       >
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBasket className="w-10 h-10 text-muted-foreground/30" />
                          )}
                          {!isOwner && product.rating > 0 && <span className="absolute bottom-1 left-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-[9px] font-bold text-background">★ {Number(product.rating).toFixed(1)}</span>}
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
                         <button type="button" className="block max-w-full text-left" onClick={() => !isOwner && navigate(`/product/${product.id}`)}>
                           <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                           {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
                         </button>

                        {!isOwner && getVariants(product).length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-bold text-muted-foreground">سائز منتخب کریں</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {getVariants(product).map((variant: any, index: number) => {
                                const key = variantKey(variant, index);
                                const active = (selectedVariants[product.id] || variantKey(getVariants(product)[0], 0)) === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelectedVariants((prev) => ({ ...prev, [product.id]: key }))}
                                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"}`}
                                  >
                                    {variant.label || variant.name}
                                    {Number(variant.price_delta || 0) !== 0 && <span className="ms-1 text-[9px]">{Number(variant.price_delta) > 0 ? "+" : ""}{variant.price_delta}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}



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
                            <div>
                              <span className="text-[10px] text-muted-foreground">تفصیل / Details:</span>
                              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="پروڈکٹ کی تفصیل لکھیں..." rows={3} className="mt-1 text-xs" />
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
                              {product.wholesale_price || product.discount_price ? (
                                <>
                                  <span className="text-sm font-extrabold text-destructive">Rs {product.wholesale_price || product.discount_price}</span>
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
                                <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" onClick={() => cartLine && updateQuantity(cartLine.id, qty - 1)}>
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold w-5 text-center">{qty}</span>
                                <button className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" onClick={() => handleAdd(product)}>
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Minimum order warning under product */}
                            {minimumOrder > 0 && qty > 0 && storeCartTotal < minimumOrder && !isOwner && (
                              <p className="text-[9px] text-destructive font-bold mt-1 col-span-full">
                                Rs {minimumOrder - storeCartTotal} اور شامل کریں
                              </p>
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

          {(!isBazar || isOwner) && (
          <TabsContent value="orders">
            {isOwner ? (
              <>
                <ShopkeeperCartOrders storeId={id!} />
                <ShopkeeperListOrders storeId={id!} />
              </>
            ) : (
              <div className="space-y-2">
                <PhotoListOrder storeId={id!} storeName={store.name} advancePercent={store.advance_percent || 0} />
                <CustomerListOrders storeId={id!} />
              </div>
            )}
          </TabsContent>
          )}
          {isOwner && (
            <TabsContent value="reels">
              <MyReelsManager restrictSourceId={id!} />
            </TabsContent>
          )}
        </Tabs>

      </div>

      <BottomTabBar />
    </div>
  );
};

export default GroceryStoreDetail;
