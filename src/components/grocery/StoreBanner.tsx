import { img } from "@/lib/imageUrl";
import { ShoppingBasket, Star, Clock, Pencil, Camera, Plus, Palette, ArrowLeft, Link, Share2, Copy, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import ProductPhotoUploader from "@/components/media/ProductPhotoUploader";
import PhotoTips from "@/components/media/PhotoTips";
import AiSetupAssistant from "@/components/ai/AiSetupAssistant";


// Grocery collage images per category
import attaRice from "@/assets/grocery/atta-rice.jpg";
import oil from "@/assets/grocery/oil.jpg";
import dal from "@/assets/grocery/dal.jpg";
import spices from "@/assets/grocery/spices.jpg";
import tea from "@/assets/grocery/tea.jpg";
import sugar from "@/assets/grocery/sugar.jpg";
import fruits from "@/assets/grocery/fruits.jpg";
import vegetables from "@/assets/grocery/vegetables.jpg";
import milk from "@/assets/grocery/milk.jpg";
import beverages from "@/assets/grocery/beverages.jpg";
import chicken from "@/assets/meat/whole-chicken.jpg";
import mutton from "@/assets/meat/mutton.jpg";
import fish from "@/assets/meat/fish.jpg";
import eggs from "@/assets/meat/eggs.jpg";
import ghee from "@/assets/grocery/ghee.jpg";
import biscuits from "@/assets/grocery/biscuits.jpg";

const COLLAGE_SETS: Record<string, string[]> = {
  General: [attaRice, oil, dal, spices, tea, sugar, ghee, biscuits],
  Fruits: [fruits, beverages, tea, sugar, oil, milk, dal, spices],
  Vegetables: [vegetables, fruits, oil, spices, dal, attaRice, sugar, tea],
  Dairy: [milk, ghee, beverages, biscuits, sugar, tea, oil, dal],
  "Eggs & Meat": [chicken, mutton, fish, eggs, spices, oil, dal, attaRice],
  "Atta & Rice": [attaRice, dal, sugar, oil, ghee, spices, tea, biscuits],
  Beverages: [beverages, tea, milk, sugar, biscuits, fruits, oil, dal],
  Snacks: [biscuits, beverages, tea, sugar, fruits, oil, spices, dal],
  Cleaning: [oil, sugar, dal, spices, tea, attaRice, ghee, biscuits],
  "Personal Care": [milk, beverages, tea, sugar, oil, dal, spices, biscuits],
};

const BANNER_THEMES: Record<string, { gradient: string; label: string }> = {
  none: { gradient: "", label: "🚫 بغیر / None" },
  light: { gradient: "from-black/20 to-black/10", label: "🌤 ہلکا / Light" },
  dark: { gradient: "from-black/50 to-black/30", label: "🌑 گہرا / Dark" },
};

const NAME_SIZES: Record<string, { className: string; label: string }> = {
  small: { className: "text-lg", label: "چھوٹا / Small" },
  medium: { className: "text-xl", label: "درمیانہ / Medium" },
  large: { className: "text-2xl", label: "بڑا / Large" },
  xlarge: { className: "text-3xl", label: "بہت بڑا / X-Large" },
};

const NAME_STYLES: Record<string, { className: string; label: string }> = {
  bold: { className: "font-extrabold", label: "بولڈ / Bold" },
  italic: { className: "font-bold italic", label: "اٹالک / Italic" },
  uppercase: { className: "font-extrabold uppercase tracking-wider", label: "بڑے حروف / UPPERCASE" },
  light: { className: "font-light", label: "ہلکا / Light" },
  fancy: { className: "font-extrabold tracking-tight", label: "فینسی / Fancy" },
};

interface StoreBannerProps {
  store: any;
  isOwner: boolean;
  storeId: string;
  onRefresh: () => void;
  categories: string[];
  showAddProduct: boolean;
  setShowAddProduct: (v: boolean) => void;
  newProduct: any;
  setNewProduct: (v: any) => void;
  addProduct: () => void;
  onNavigateBack: () => void;
}

const StoreBanner = ({
  store, isOwner, storeId, onRefresh, categories: groceryCategories,
  showAddProduct, setShowAddProduct, newProduct, setNewProduct, addProduct, onNavigateBack
}: StoreBannerProps) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  const theme = BANNER_THEMES[store.banner_theme] || BANNER_THEMES.none;
  const nameStyle = NAME_STYLES[store.name_style] || NAME_STYLES.bold;
  const nameSize = NAME_SIZES[store.name_size] || NAME_SIZES.medium;
  const nameColor = store.name_color || "#ffffff";
  const collageImages = COLLAGE_SETS[store.category] || COLLAGE_SETS.General;

  // Product form: category list and category-aware optional fields
  const productCategories = Array.from(new Set([...groceryCategories, "Electronics", "Mobiles", "Clothing", "Shoes", "Home & Kitchen", "Beauty", "Sports", "Toys", "Hardware", "Other"]));
  const isClothingCat = ["Clothing", "Shoes"].includes(newProduct.category);
  const isTechCat = ["Electronics", "Mobiles"].includes(newProduct.category);

  const updateStore = async (updates: Record<string, any>) => {
    const { error } = await supabase.from("grocery_stores").update(updates).eq("id", storeId);
    if (error) { toast.error("اپڈیٹ ناکام: " + error.message); return; }
    toast.success("اپڈیٹ ہو گیا / Updated");
    onRefresh();
  };

  return (
    <div className="relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="icon" className="bg-card/80 backdrop-blur" onClick={onNavigateBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative isolate overflow-hidden">
        {store.image_url ? (
          <img src={img(store.image_url, 960)} alt={store.name} className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="grid h-56 w-full grid-cols-4 grid-rows-2 sm:h-72">
            {collageImages.slice(0, 8).map((img, i) => <img key={i} src={img} alt="" className="h-full w-full object-cover" />)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-foreground/80 via-foreground/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
          <div className="min-w-0 text-primary-foreground drop-shadow-md"><p className="mb-1 flex items-center gap-1 text-[10px] font-bold"><ShoppingBasket className="size-3" /> تصدیق شدہ اسٹور</p><h1 className="text-xl font-extrabold leading-tight break-words sm:text-3xl">{store.name}</h1><p className="mt-1 text-xs opacity-90">{store.category} · {store.delivery_time || "تیز ڈیلیوری"}</p></div>
          {isOwner && <div className="shrink-0 rounded-lg bg-card/90 p-1 shadow-elegant backdrop-blur"><ProductPhotoUploader aspect="wide" label="بینر تبدیل" onDone={async (photos) => { const photo = photos[0]; if (!photo) return; const path = `store-banners/${crypto.randomUUID()}/${storeId}.webp`; const { error: upErr } = await supabase.storage.from("product-images").upload(path, photo.file, { upsert: false, contentType: photo.file.type }); if (upErr) throw new Error(upErr.message); const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path); const { data: saved, error } = await supabase.from("grocery_stores").update({ image_url: urlData.publicUrl }).eq("id", storeId).select("id").single(); if (error || !saved) throw new Error(error?.message || "بینر محفوظ نہیں ہو سکا"); toast.success("بینر تبدیل ہو گیا"); onRefresh(); }} /></div>}
        </div>
      </div>

       {/* Store details and owner controls */}
       <div className="border-b bg-card px-4 py-3">
         <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
           <span className="flex items-center gap-1"><Star className="size-4 text-primary" /> {store.rating || "New"}</span>
           <span className="flex items-center gap-1">
             <Clock className="size-4" /> {store.delivery_time || "تیز ڈیلیوری"}
             {isOwner && <button className="text-muted-foreground hover:text-foreground" aria-label="ڈیلیوری وقت تبدیل کریں" onClick={async () => { const val = prompt("ڈلیوری ٹائم / Delivery Time:", store.delivery_time); if (val && val.trim()) await updateStore({ delivery_time: val.trim() }); }}><Pencil className="size-3" /></button>}
           </span>
           <span className="flex items-center gap-1 font-semibold text-foreground">
             {store.category}
             {isOwner && <button className="text-muted-foreground hover:text-foreground" aria-label="کیٹیگری تبدیل کریں" onClick={async () => { const val = prompt("کیٹیگری / Category:\n" + groceryCategories.join(", "), store.category); if (val && val.trim()) await updateStore({ category: val.trim() }); }}><Pencil className="size-3" /></button>}
           </span>
           {isOwner && <button className="ms-auto text-muted-foreground hover:text-foreground" aria-label="دکان کا نام تبدیل کریں" onClick={async () => { const newName = prompt("دکان کا نام / Store Name:", store.name); if (newName && newName.trim() && newName.trim() !== store.name) await updateStore({ name: newName.trim() }); }}><Pencil className="size-4" /></button>}
         </div>

        {/* Shop Timing & Open/Close Toggle for Owner */}
        {isOwner && (
          <div className="mt-2 flex items-center gap-3 flex-wrap bg-secondary/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">🕐 ٹائمنگ:</span>
              <input
                type="time"
                className="h-7 text-xs border rounded-md px-2 bg-background text-foreground"
                defaultValue={(store as any).opening_time || "08:00"}
                onChange={async (e) => {
                  await updateStore({ opening_time: e.target.value } as any);
                }}
              />
              <span className="text-xs text-muted-foreground">سے</span>
              <input
                type="time"
                className="h-7 text-xs border rounded-md px-2 bg-background text-foreground"
                defaultValue={(store as any).closing_time || "22:00"}
                onChange={async (e) => {
                  await updateStore({ closing_time: e.target.value } as any);
                }}
              />
            </div>
            <button
              onClick={() => updateStore({ is_active: !store.is_active })}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                store.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {store.is_active ? "🟢 کھلی ہے / Open" : "🔴 بند ہے / Closed"}
            </button>
          </div>
        )}

        {/* Show closed notice to customers */}
        {!isOwner && !store.is_active && (
          <div className="mt-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold px-3 py-2 rounded-lg text-center">
            🔴 دکان ابھی بند ہے / Shop is currently closed
            {(store as any).opening_time && (store as any).closing_time && (
              <span className="block mt-0.5 font-normal">
                ٹائمنگ: {(store as any).opening_time} - {(store as any).closing_time}
              </span>
            )}
          </div>
        )}

        {/* Show timing to customers when open */}
        {!isOwner && store.is_active && (store as any).opening_time && (store as any).closing_time && (
          <p className="text-[11px] text-muted-foreground mt-1">
            🕐 ٹائمنگ: {(store as any).opening_time} - {(store as any).closing_time}
          </p>
        )}

        {isOwner && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">👑 آپ کی دکان</span>
            
            {/* Theme Picker */}
            <Dialog open={showThemePicker} onOpenChange={setShowThemePicker}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Palette className="h-3 w-3 mr-1" /> تھیم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>بینر تھیم / Banner Theme</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Overlay */}
                  <div>
                    <p className="text-sm font-medium mb-2">اوورلے / Overlay</p>
                    <div className="flex gap-2">
                      {Object.entries(BANNER_THEMES).map(([key, t]) => (
                        <button
                          key={key}
                          onClick={() => updateStore({ banner_theme: key })}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            store.banner_theme === key ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Size */}
                  <div>
                    <p className="text-sm font-medium mb-2">نام کا سائز / Name Size</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(NAME_SIZES).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => updateStore({ name_size: key })}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            store.name_size === key ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Color */}
                  <div>
                    <p className="text-sm font-medium mb-2">نام کا رنگ / Name Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {["#ffffff", "#FFD700", "#00FF88", "#FF6B6B", "#87CEEB", "#FFA500", "#E0E0E0", "#FF69B4"].map(color => (
                        <button
                          key={color}
                          onClick={() => updateStore({ name_color: color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            nameColor === color ? "border-primary ring-2 ring-primary/30 scale-110" : "border-muted"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Name Style */}
                  <div>
                    <p className="text-sm font-medium mb-2">نام کا اسٹائل / Name Style</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(NAME_STYLES).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => updateStore({ name_style: key })}
                          className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${s.className} ${
                            store.name_style === key ? "border-primary bg-primary/10" : "border-muted"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slug / Store Link */}
                  <div>
                    <p className="text-sm font-medium mb-2">اسٹور لنک / Store Link</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">/store/</span>
                      <Input
                        className="h-8 text-sm flex-1"
                        defaultValue={store.slug || ""}
                        placeholder="my-store"
                        onBlur={async (e) => {
                          const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                          if (!val) { toast.error("لنک خالی نہیں ہو سکتا"); return; }
                          if (val === store.slug) return;
                          const { error } = await supabase.from("grocery_stores").update({ slug: val }).eq("id", storeId);
                          if (error) {
                            toast.error(error.message.includes("duplicate") ? "یہ لنک پہلے سے استعمال ہو رہا ہے" : error.message);
                            return;
                          }
                          toast.success("لنک اپڈیٹ ہو گیا");
                          onRefresh();
                        }}
                      />
                    </div>
                    {store.slug && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        {window.location.origin}/store/{store.slug}
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Share Buttons */}
            {store.slug && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  const storeUrl = `${window.location.origin}/store/${store.slug}`;
                  const appUrl = `${window.location.origin}/install`;
                  const msg = `🛒 *${store.name}* پر آرڈر کریں!\n\n📱 اسٹور لنک:\n${storeUrl}\n\n📥 ایپ ڈاؤنلوڈ کریں:\n${appUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}>
                  <MessageCircle className="h-3 w-3" /> واٹس ایپ
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  const storeUrl = `${window.location.origin}/store/${store.slug}`;
                  navigator.clipboard.writeText(storeUrl);
                  toast.success("لنک کاپی ہو گیا / Link copied!");
                }}>
                  <Copy className="h-3 w-3" /> لنک کاپی
                </Button>
              </div>
            )}

            <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
              <DialogTrigger asChild><Button size="sm" className="h-7 text-xs"><Plus className="me-1 h-3 w-3" /> پروڈکٹ شامل</Button></DialogTrigger>
              <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
                <DialogHeader><DialogTitle>نئی پروڈکٹ / Add product</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">یہ فارم <b>ایک</b> چیز کے لیے ہے۔ سینکڑوں اشیا ایک ساتھ ڈالنے کے لیے <b>اسٹاک</b> ٹیب سے Excel/CSV امپورٹ یا <b>AI مددگار</b> استعمال کریں۔</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="نام / Product name *" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                    <Input placeholder="قیمت / Price (Rs) *" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <Input placeholder="ڈسکاؤنٹ قیمت / Sale price" type="number" value={newProduct.discount_price} onChange={(e) => setNewProduct({...newProduct, discount_price: e.target.value})} />
                    <select className="w-full rounded-md border bg-background p-2 text-sm text-foreground" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>{productCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
                    <Input list="unit-options" placeholder="یونٹ / Unit — piece, kg, litre" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                    <Input placeholder="اسٹاک / Stock" type="number" value={newProduct.stock_qty} onChange={(e) => setNewProduct({...newProduct, stock_qty: e.target.value})} />
                  </div>
                  <datalist id="unit-options"><option value="piece" /><option value="kg" /><option value="g" /><option value="litre" /><option value="ml" /><option value="dozen" /><option value="pack" /><option value="box" /><option value="meter" /><option value="set" /></datalist>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="ڈیلیوری وزن / Weight (kg)" type="number" step="0.1" min="0.1" value={newProduct.weight_kg} onChange={(e) => setNewProduct({...newProduct, weight_kg: e.target.value})} />
                    <select className="w-full rounded-md border bg-background p-2 text-sm text-foreground" value={newProduct.shipping_class} onChange={(e) => setNewProduct({...newProduct, shipping_class: e.target.value})}><option value="standard">عام پارسل / Standard</option><option value="fragile">نازک / Fragile</option><option value="bulk">بلک / Bulk</option><option value="oversized">بڑا سامان / Oversized</option></select>
                  </div>
                  {isClothingCat && (
                    <div><p className="mb-2 text-xs font-extrabold text-foreground">لباس / جوتے — سائز اور رنگ</p><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="سائز / Sizes — S, M, L, 40, 41" value={newProduct.sizes} onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})} /><Input placeholder="رنگ / Colours — کالا, سفید" value={newProduct.colors} onChange={(e) => setNewProduct({...newProduct, colors: e.target.value})} /><Input placeholder="مواد / Material" value={newProduct.material} onChange={(e) => setNewProduct({...newProduct, material: e.target.value})} /></div></div>
                  )}
                  {isTechCat && (
                    <div><p className="mb-2 text-xs font-extrabold text-foreground">بجلی / موبائل — specifications</p><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="برانڈ / Brand" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} /><Input placeholder="SKU / ماڈل نمبر" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} /><Input placeholder="وولٹیج / Voltage" value={newProduct.voltage} onChange={(e) => setNewProduct({...newProduct, voltage: e.target.value})} /><Input placeholder="موبائل اسکرین سائز" value={newProduct.screen_size} onChange={(e) => setNewProduct({...newProduct, screen_size: e.target.value})} /><Input placeholder="RAM" value={newProduct.ram} onChange={(e) => setNewProduct({...newProduct, ram: e.target.value})} /><Input placeholder="Storage / میموری" value={newProduct.storage} onChange={(e) => setNewProduct({...newProduct, storage: e.target.value})} /></div></div>
                  )}
                  <details className="rounded-lg border border-border/60 p-3">
                    <summary className="cursor-pointer text-xs font-bold text-muted-foreground">مزید تفصیل (اختیاری) — برانڈ، ماڈل، tags، مکمل تفصیل، تصویر لنک</summary>
                    <div className="mt-3 space-y-2">
                      {!isTechCat && <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="برانڈ / Brand" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} /><Input placeholder="SKU / ماڈل نمبر" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} /></div>}
                      {!isClothingCat && !isTechCat && <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="وزن / Weight — مثلاً 500g" value={newProduct.weight} onChange={(e) => setNewProduct({...newProduct, weight: e.target.value})} /><Input placeholder="سائز یا dimensions" value={newProduct.dimensions} onChange={(e) => setNewProduct({...newProduct, dimensions: e.target.value})} /><Input placeholder="مواد / Material" value={newProduct.material} onChange={(e) => setNewProduct({...newProduct, material: e.target.value})} /></div>}
                      <Textarea placeholder="مکمل تفصیل / استعمال، خصوصیات، warranty" rows={3} value={newProduct.description || ""} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
                      <Input placeholder="Tags — نیا, premium, wholesale" value={newProduct.tags} onChange={(e) => setNewProduct({...newProduct, tags: e.target.value})} />
                      <Input placeholder="تصویر URL / Image URL (optional)" value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} />
                    </div>
                  </details>
                  <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground">پروڈکٹ کی تصاویر / Product photos (8 تک)</label><ProductPhotoUploader multiple label="تصاویر منتخب کریں" onDone={(photos) => setNewProduct({ ...newProduct, imageFiles: photos.map((photo) => photo.file) })} /><p className="text-[10px] text-muted-foreground">گیلری سے ایک ساتھ کئی تصاویر منتخب کر سکتے ہیں، پھر «محفوظ کریں» دبائیں</p>{newProduct.imageFiles?.length > 0 && <p className="text-[10px] font-semibold text-primary">{newProduct.imageFiles.length} تصاویر تیار ہیں</p>}<PhotoTips /></div>
                  <Button onClick={addProduct} className="w-full">پروڈکٹ محفوظ کریں</Button>
                </div>
              </DialogContent>
            </Dialog>

            <AiSetupAssistant kind="grocery" onSave={async (items) => {
              let added = 0;
              for (const item of items) {
                const { error } = await supabase.from("grocery_products").insert({ store_id: storeId, name: item.name.trim(), price: Number(item.price) || 0, unit: item.unit || "piece", category: item.category || "General", description: item.description || null });
                if (!error) added++;
              }
              toast.success(`${added} اشیا شامل ہو گئیں / Items added`);
              onRefresh();
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreBanner;
