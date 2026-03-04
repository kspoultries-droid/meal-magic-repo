import { ShoppingBasket, Star, Clock, Pencil, Camera, Plus, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

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

  const updateStore = async (updates: Record<string, any>) => {
    await supabase.from("grocery_stores").update(updates).eq("id", storeId);
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

      <div className="relative overflow-hidden">
        {/* Grocery Images Collage Background */}
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-52 grid grid-cols-4 grid-rows-2">
            {collageImages.slice(0, 8).map((img, i) => (
              <img key={i} src={img} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        )}

        {/* Overlay - only bottom gradient for text readability */}
        {theme.gradient && <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Store Info */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
          <div className="flex items-center gap-2">
            <h1
              className={`flex-1 drop-shadow-lg ${nameStyle.className} ${nameSize.className}`}
              style={{ color: nameColor, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
            >
              {store.name}
            </h1>
            {isOwner && (
              <button className="text-white/70 hover:text-white" onClick={async () => {
                const newName = prompt("دکان کا نام / Store Name:", store.name);
                if (newName && newName.trim() && newName.trim() !== store.name) {
                  await updateStore({ name: newName.trim() });
                }
              }}>
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-white/80 flex-wrap">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {store.rating || "New"}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {store.delivery_time}
              {isOwner && (
                <button className="text-white/60 hover:text-white ml-0.5" onClick={async () => {
                  const val = prompt("ڈلیوری ٹائم / Delivery Time:", store.delivery_time);
                  if (val && val.trim()) await updateStore({ delivery_time: val.trim() });
                }}>
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </span>
            <span className="font-semibold text-white flex items-center gap-1">
              {store.category}
              {isOwner && (
                <button className="text-white/60 hover:text-white" onClick={async () => {
                  const val = prompt("کیٹیگری / Category:\n" + groceryCategories.join(", "), store.category);
                  if (val && val.trim()) await updateStore({ category: val.trim() });
                }}>
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </span>
          </div>

          {isOwner && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-bold backdrop-blur-sm">👑 آپ کی دکان</span>
              
              {/* Theme Picker */}
              <Dialog open={showThemePicker} onOpenChange={setShowThemePicker}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-white bg-white/20 hover:bg-white/30">
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
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add Product */}
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> پروڈکٹ شامل</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>نئی پروڈکٹ / New Product</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="نام / Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                    <Input placeholder="قیمت / Price (Rs)" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <Input placeholder="ڈسکاؤنٹ قیمت / Discount Price (optional)" type="number" value={newProduct.discount_price} onChange={(e) => setNewProduct({...newProduct, discount_price: e.target.value})} />
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                      {groceryCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <Input placeholder="یونٹ / Unit (kg, piece, dozen)" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                    <Input placeholder="تصویر URL / Image URL (optional)" value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} />
                    <Button onClick={addProduct} className="w-full">شامل کریں / Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Owner: Banner change & theme buttons */}
        {isOwner && (
          <div className="absolute top-4 right-4 z-20 flex gap-1.5">
            <label className="flex items-center gap-1 bg-card/90 backdrop-blur text-foreground text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer shadow-md border">
              <Camera className="w-3.5 h-3.5" /> بینر تبدیل
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const ext = file.name.split('.').pop();
                const path = `store-banners/${storeId}.${ext}`;
                const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
                if (upErr) { toast.error(upErr.message); return; }
                const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                await updateStore({ image_url: urlData.publicUrl });
              }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

// Need to import ArrowLeft
import { ArrowLeft } from "lucide-react";

export default StoreBanner;
