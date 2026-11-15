import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Clock3, Heart, MapPin, Minus, Plus, Share2, ShoppingBag, Star, Store, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { recordRecent } from "@/lib/recentlyViewed";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import ProductGallery from "@/components/product/ProductGallery";
import ProductQuestions from "@/components/product/ProductQuestions";
import RelatedProducts, { type RelatedItem } from "@/components/product/RelatedProducts";
import { availableShopQuantity } from "@/lib/shopOrders";
import { toast } from "sonner";
import { isMatrix } from "@/lib/variantMatrix";




const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, setIsOpen } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
   const [related, setRelated] = useState<RelatedItem[]>([]);
   const [reviews, setReviews] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState(new URLSearchParams(window.location.search).get("tab") || "overview");
   const [reviewSummary, setReviewSummary] = useState({ rating: 0, count: 0 });
   const [shopRating, setShopRating] = useState({ rating: 0, count: 0 });
   const [liked, setLiked] = useState(false);
   const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data: productDataRaw, error } = await supabase.from("grocery_products").select("*").eq("id", id).maybeSingle();
      const productData = productDataRaw as any;
      if (error || !productData) {
        setProduct(null);
        setLoading(false);
        return;
      }
       const [{ data: storeData }, { data: relatedData }, { data: reviewData }] = await Promise.all([
         supabase.from("grocery_stores").select("*").eq("id", productData.store_id).maybeSingle(),
         supabase.from("grocery_products").select("id,name,price,discount_price,wholesale_price,image_url").eq("store_id", productData.store_id).neq("id", id).eq("is_available", true).limit(6),
         supabase.rpc("product_public_reviews", { _product_id: id, _limit: 20 }),
       ]);
       const { data: shopSummary } = await supabase.rpc("shop_public_reviews", { _store_id: productData.store_id, _limit: 1 });
       setShopRating({ rating: Number((shopSummary as any)?.rating || 0), count: Number((shopSummary as any)?.count || 0) });
       recordRecent(productData, user?.id);
       setProduct(productData);
       setStore(storeData);
       setRelated(relatedData || []);
       const summary = reviewData as any;
       setReviews(summary?.reviews || []);
       setReviewSummary({ rating: Number(summary?.rating || 0), count: Number(summary?.count || 0) });
       setLoading(false);
    };
    load();
  }, [id]);

  const [pickColor, setPickColor] = useState("");
  const [pickSize, setPickSize] = useState("");
  const variants = useMemo(() => {
    if (!Array.isArray(product?.variants)) return [];
    return product.variants.filter((variant: any) => variant && (variant.label || variant.name));
  }, [product]);
  const matrix = isMatrix(variants);
  const colorList = useMemo(() => { const m = new Map<string, any>(); variants.forEach((v: any) => v.color && !m.has(v.color) && m.set(v.color, v)); return [...m.values()]; }, [variants]);
  const sizeList = useMemo(() => variants.filter((v: any) => v.size && (!colorList.length || v.color === pickColor)), [variants, colorList.length, pickColor]);
  const images = useMemo(() => {
    const extra = Array.isArray(product?.images) ? product.images : [];
    const chosen = colorList.find((v: any) => v.color === pickColor)?.image;
    return Array.from(new Set([chosen, product?.image_url, ...extra].filter(Boolean))) as string[];
  }, [product, colorList, pickColor]);
  const variantKey = (variant: any, index: number) => String(variant.id || variant.label || variant.name || index);
  const selectedVariant = variants.find((variant: any, index: number) => variantKey(variant, index) === selectedVariantId);
  const selectedVariantCartId = selectedVariant ? (selectedVariant.id || selectedVariant.label || null) : null;
  const basePrice = Number(product?.wholesale_price ?? product?.discount_price ?? product?.price ?? 0);
  const effectivePrice = Math.max(0, basePrice + Number(selectedVariant?.price_delta || 0));
  const listPrice = Number(product?.price ?? 0) + (matrix ? Number(selectedVariant?.price_delta || 0) : 0);
  const hasDiscount = effectivePrice < listPrice;
  const discount = hasDiscount ? Math.round(((listPrice - effectivePrice) / listPrice) * 100) : 0;
  const cartLine = items.find((item) => item.menu_item_id === id && item.sourceId === product?.store_id && (item.variant_id || null) === selectedVariantCartId);
  const quantity = cartLine?.quantity || 0;
  const availableQuantity = availableShopQuantity(product || {}, selectedVariant);

  useEffect(() => {
    if (matrix) { setPickColor(variants[0]?.color || ""); setPickSize(variants[0]?.size || ""); return; }
    setSelectedVariantId(variants[0] ? String(variants[0].id || variants[0].label) : "");
  }, [product?.id, variants, matrix]);
  useEffect(() => {
    if (!matrix) return;
    const sizeOk = !pickSize || sizeList.some((v: any) => v.size === pickSize);
    const size = sizeOk ? pickSize : sizeList[0]?.size || "";
    if (size !== pickSize) { setPickSize(size); return; }
    const idx = variants.findIndex((v: any) => (v.color || "") === (colorList.length ? pickColor : "") && (v.size || "") === size);
    setSelectedVariantId(idx >= 0 ? variantKey(variants[idx], idx) : "");
  }, [matrix, pickColor, pickSize, sizeList, variants, colorList.length]);

  const addToCart = (): boolean => {
    if (!product || !store) return false;
    if (availableQuantity !== null && quantity >= availableQuantity) { toast.error(L("Selected quantity not available", "منتخب مقدار دستیاب نہیں")); return false; }
    if (variants.length > 0 && !selectedVariant) { toast.error(L("Please choose colour and size", "براہ کرم رنگ اور سائز منتخب کریں")); return false; }
    const variantLabel = selectedVariant?.label || selectedVariant?.name;
      return addItem({
        id: product.id,
        name: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
        restaurant: store.name,
        price: effectivePrice,
        image: selectedVariant?.image || product.image_url || images[0] || "",
        source: "grocery",
        sourceId: store.id,
        bazar: store.store_type === "wholesale",
        weight_kg: product.weight_kg,
        weight: product.weight,
        unit: product.unit,
        variant_id: selectedVariantCartId,
        variant_label: variantLabel || null,
      });
  };

  const buyNow = () => {
    // Only open checkout when the item actually went into the cart;
    // if the cart holds another shop's items, addItem warns and returns false.
    if (addToCart()) navigate("/checkout");
  };

  if (loading) return (
    <div className="min-h-screen bg-background px-4 py-5" aria-live="polite" aria-label={L("Product is loading", "پروڈکٹ لوڈ ہو رہی ہے")}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-14 rounded-2xl bg-muted animate-pulse" />
        <div className="aspect-square max-h-[430px] rounded-3xl bg-muted animate-pulse" />
        <div className="space-y-3"><div className="h-7 w-2/3 rounded-lg bg-muted animate-pulse" /><div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" /><div className="h-24 rounded-2xl bg-muted animate-pulse" /></div>
      </div>
    </div>
  );
  if (!product || !store) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><p className="text-muted-foreground">{L("Product not found", "پروڈکٹ نہیں ملی")}</p><Button onClick={() => navigate(-1)}>{L("Go back", "واپس جائیں")}</Button></div>;

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Button variant="ghost" size="icon" aria-label={L("Back", "واپس")} onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">{L("Search products", "پروڈکٹ تلاش کریں")}</div>
          <Button variant="ghost" size="icon" aria-label={L("Favourite", "پسندیدہ")} onClick={() => setLiked((value) => !value)}><Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : ""}`} /></Button>
          <Button variant="ghost" size="icon" aria-label={L("Cart", "کارٹ")} onClick={() => setIsOpen(true)}><ShoppingBag className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <section className="overflow-hidden bg-card border-b border-border/60 sm:mt-4 sm:rounded-3xl sm:border md:grid md:grid-cols-2 md:items-start">
          <div className="mx-auto w-full max-w-[440px] md:max-w-[380px] md:p-4"><div className="overflow-hidden md:rounded-2xl md:border md:border-border/60"><ProductGallery key={pickColor} images={images} name={product.name} rating={reviewSummary.rating} /></div></div>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {hasDiscount && <span className="rounded-md bg-destructive px-2 py-1 text-[10px] font-extrabold text-destructive-foreground">-{discount}% {L("off", "آفر")}</span>}
                  {availableQuantity !== 0 && product.is_available && <span className="flex items-center gap-1 text-[10px] font-bold text-success"><Check className="h-3 w-3" /> {availableQuantity === null ? L("In stock", "دستیاب ہے") : L(`Available: ${availableQuantity}`, `دستیاب: ${availableQuantity}`)}</span>}
                  {availableQuantity === 0 && <span className="text-xs font-bold text-destructive">{L("Out of stock", "اسٹاک ختم")}</span>}
                </div>
                <h1 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">{product.name}</h1>
                <p className="mt-1 text-xs text-muted-foreground">{product.brand || product.category || L("Standard product", "معیاری پروڈکٹ")}{product.unit ? L(` · per ${product.unit}`, ` · فی ${product.unit}`) : ""}{product.weight ? ` · ${product.weight}` : ""}</p>
              </div>
              <Button variant="outline" size="icon" aria-label={L("Share", "شیئر کریں")} onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}><Share2 className="h-4 w-4" /></Button>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-black text-primary">Rs. {effectivePrice.toLocaleString()}</span>
              {hasDiscount && <span className="text-sm text-muted-foreground line-through">Rs. {listPrice.toLocaleString()}</span>}
            </div>
            {hasDiscount && <p className="mt-1 inline-flex rounded-lg bg-success/10 px-2.5 py-1 text-xs font-extrabold text-success">{L(`You save Rs. ${(listPrice - effectivePrice).toLocaleString()}`, `آپ کی بچت Rs. ${(listPrice - effectivePrice).toLocaleString()}`)}</p>}
            {availableQuantity !== null && availableQuantity > 0 && availableQuantity <= 5 && <p className="mt-2 text-xs font-extrabold text-destructive">{L(`Hurry! Only ${availableQuantity} left`, `جلدی کریں! صرف ${availableQuantity} باقی`)}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <InfoTile icon={<ShoppingBag className="h-3.5 w-3.5" />} label={L("Payment", "ادائیگی")} value={L("Cash on delivery", "کیش آن ڈیلیوری")} />
              <InfoTile icon={<BadgeCheck className="h-3.5 w-3.5" />} label={L("Seller", "فروخت کنندہ")} value={L("Verified shop", "تصدیق شدہ دکان")} />
              <InfoTile icon={<Clock3 className="h-3.5 w-3.5" />} label={L("Check", "جانچ")} value={L("Check at delivery", "وصولی پر چیک کریں")} />
              <InfoTile icon={<MapPin className="h-3.5 w-3.5" />} label={L("Delivery", "ڈیلیوری")} value={store.ships_nationwide ? L("Nationwide", "ملک بھر") : L("Local rider", "مقامی رائیڈر")} />
            </div>
            {product.delivery_days && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Truck className="h-3.5 w-3.5 text-primary" />{L(`Delivery: ${product.delivery_days}`, `ڈیلیوری: ${product.delivery_days}`)}</p>}
            {product.min_order_qty > 1 && <p className="mt-2 text-xs font-bold text-destructive">{L(`Minimum order: ${product.min_order_qty} pcs`, `کم از کم آرڈر: ${product.min_order_qty} عدد`)}</p>}
            {matrix && (
              <div className="mt-4 space-y-4">
                {colorList.length > 0 && <div>
                  <p className="mb-2 text-xs font-extrabold text-foreground">{L("Design / colour", "ڈیزائن / رنگ")}: <span className="text-primary">{pickColor}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {colorList.map((v: any) => { const active = v.color === pickColor; return (
                      <button key={v.color} type="button" aria-pressed={active} onClick={() => setPickColor(v.color)} className={`flex items-center gap-2 rounded-xl border-2 p-1 pe-3 text-xs font-bold ${active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-foreground"}`}>
                        {v.image ? <img src={v.image} alt={v.color} className="h-10 w-10 rounded-lg bg-background object-contain" loading="lazy" /> : <span className="h-10 w-2" />}
                        <span>{v.color}</span>
                      </button>); })}
                  </div>
                </div>}
                {sizeList.length > 0 && <div>
                  <p className="mb-2 text-xs font-extrabold text-foreground">{L("Size", "سائز")}: <span className="text-primary">{pickSize}</span></p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {sizeList.map((v: any) => { const active = v.size === pickSize; const out = v.is_available === false; return (
                      <button key={v.size} type="button" disabled={out} aria-pressed={active} onClick={() => setPickSize(v.size)} className={`rounded-xl border-2 px-2 py-2 text-xs font-bold disabled:opacity-40 ${active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-foreground"}`}>
                        <span className="block">{v.size}</span>
                        {v.size_note && <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{v.size_note}</span>}
                      </button>); })}
                  </div>
                </div>}
              </div>
            )}
            {!matrix && variants.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-foreground">{L("Choose size / color", "سائز / رنگ منتخب کریں")}</p>
                  <span className="text-[10px] font-bold text-primary">{L("Required", "لازمی")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {variants.map((variant: any, index: number) => {
                    const variantId = variantKey(variant, index);
                    const label = variant.label || variant.name || String(variant);
                    const active = selectedVariantId === variantId;
                    return (
                      <button key={variantId} type="button" onClick={() => setSelectedVariantId(variantId)} className={`rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors ${active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-foreground"}`} aria-pressed={active}>
                        <span className="block truncate">{label}</span>
                        {Number(variant.price_delta || 0) !== 0 && <span className="mt-0.5 block text-[10px] text-muted-foreground">{Number(variant.price_delta) > 0 ? "+" : ""}Rs {variant.price_delta}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <nav className="sticky top-14 z-30 mt-3 border-y border-border/60 bg-background/95 px-4 backdrop-blur-xl sm:rounded-2xl sm:border">
           <div className="flex gap-5 overflow-x-auto scrollbar-hide">
             {[{ id: "overview", label: L("Overview", "جائزہ") }, { id: "details", label: L("Details", "تفصیل") }, { id: "reviews", label: L("Ratings", "ریٹنگز") }, { id: "questions", label: L("Questions", "سوالات") }, { id: "related", label: L("Similar items", "ملتی جلتی اشیاء") }].map((tab) => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 py-3 text-xs font-bold transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                 {tab.label}
               </button>
             ))}
           </div>
        </nav>

        {activeTab !== "related" && (
          <section className="mt-3 space-y-3 px-4">
            {activeTab === "overview" && (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-sm font-extrabold text-foreground">{L("About this product", "اس پروڈکٹ کے بارے میں")}</h2>
                  {product.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-sm leading-7 text-muted-foreground">
                      <li>{product.name}{product.brand ? ` — ${product.brand}` : ""}</li>
                      {product.weight && <li>{L("Weight / size", "وزن / سائز")}: {product.weight}</li>}
                      {product.unit && <li>{L("Unit", "یونٹ")}: {L(`per ${product.unit}`, `فی ${product.unit}`)}</li>}
                      <li>{L("Price", "قیمت")}: Rs. {effectivePrice.toLocaleString()}{product.min_order_qty > 1 ? L(` · min ${product.min_order_qty} pcs`, ` · کم از کم ${product.min_order_qty} عدد`) : ""}</li>
                      <li>{L(`Verified by ${store.name}, delivered with safe packing.`, `${store.name} سے تصدیق شدہ، محفوظ پیکنگ کے ساتھ ڈیلیوری۔`)}</li>
                    </ul>
                  )}
                  {Array.isArray(product.tags) && product.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{product.tags.map((tag: string) => <span key={tag} className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-accent-foreground">{tag}</span>)}</div>}
                </div>
                <DetailsBlock specs={product.specs} sku={product.sku} brand={product.brand} weight={product.weight || (product.weight_kg ? `${product.weight_kg} kg` : undefined)} unit={product.unit} warranty={warrantyFrom(product.description)} />
              </>
            )}
             {activeTab === "details" && <DetailsBlock specs={product.specs} sku={product.sku} brand={product.brand} weight={product.weight} unit={product.unit} />}
             {activeTab === "reviews" && <ReviewList reviews={reviews} summary={reviewSummary} store={store} shop={shopRating} />}
             {activeTab === "questions" && <ProductQuestions productId={product.id} storeId={store.id} storeOwnerId={store.owner_id} />}
           </section>
        )}

        <section className="mx-4 mt-3 space-y-3">

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Store className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-foreground">{store.name}</p><p className="text-xs text-muted-foreground">{store.rating ? `★ ${store.rating}` : L("New shop", "نئی دکان")} · {L("Verified shop", "تصدیق شدہ شاپ")}</p></div><Button variant="outline" size="sm" onClick={() => navigate(store.store_type === "wholesale" ? `/bazar/${store.id}` : `/grocery/${store.id}`)}>{L("View shop", "دکان دیکھیں")} <ChevronRight className="ms-1 h-3 w-3" /></Button></div>
          </div>
        </section>

        <RelatedProducts items={related} title={L("Similar items", "ملتی جلتی اشیاء")} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.25)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-hidden">
          {quantity > 0 && (
            <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border bg-card px-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={L("Decrease", "کم کریں")} onClick={() => cartLine && updateQuantity(cartLine.id, quantity - 1)}><Minus className="h-4 w-4" /></Button>
              <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" aria-label={L("Increase", "بڑھائیں")} onClick={addToCart}><Plus className="h-4 w-4" /></Button>
            </div>
          )}
          {quantity > 0 ? (<>
            <Button variant="outline" className="h-11 min-w-0 flex-1 rounded-xl border-primary/40 px-2 text-[13px] font-extrabold text-primary shadow-sm" onClick={() => navigate(store.store_type === "wholesale" ? `/bazar/${store.id}` : `/grocery/${store.id}`)}>
              <Store className="me-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">{L("Add more items", "مزید اشیاء لیں")}</span>
            </Button>
            <Button className="h-11 min-w-0 flex-1 rounded-xl bg-gradient-to-l from-primary to-primary/80 px-2 text-[13px] font-extrabold shadow-lg shadow-primary/25" onClick={() => navigate("/checkout")}>
              <span className="truncate">{L("Checkout", "چیک آؤٹ")} ({items.reduce((n, i) => n + i.quantity, 0)})</span>
              <ArrowLeft className="ms-1.5 h-4 w-4 shrink-0" />
            </Button>
          </>) : (<>
          <Button variant="outline" className="h-11 min-w-0 flex-1 rounded-xl border-primary/40 px-2 text-[13px] font-extrabold text-primary shadow-sm" onClick={addToCart}>
            <ShoppingBag className="me-1.5 h-4 w-4 shrink-0" />
            <span className="truncate">{L("Add to cart", "کارٹ میں شامل")}</span>
          </Button>
          <Button className="h-11 min-w-0 flex-1 rounded-xl bg-gradient-to-l from-primary to-primary/80 px-2 text-[13px] font-extrabold shadow-lg shadow-primary/25" onClick={buyNow}>
            <span className="truncate">{L("Buy now", "ابھی خریدیں")}</span>
            <ArrowLeft className="ms-1.5 h-4 w-4 shrink-0" />
          </Button>
          </>)}
        </div>
      </div>
    </div>
  );
};

const InfoTile = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-[10px] font-bold text-muted-foreground">{label}</span></div><p className="mt-1 text-xs font-extrabold text-foreground">{value}</p></div>;

const warrantyFrom = (text?: string | null) => { const m = String(text || "").match(/(\d+\s*(?:year|years|month|months|سال|ماہ)[^,\n]*warranty|warranty[^,\n]*)/i); return m ? m[0].trim() : undefined; };

 const fmtWarranty = (v: string, lang: string) => { const m = v.match(/^\s*(\d+)\s*(سال|year|years|ماہ|month|months)\s*(کمپنی|company)?/i); if (!m) return v; const yr = /سال|year/i.test(m[2]); const n = Number(m[1]); return lang === "ur" ? `${n} ${yr ? "سال" : "ماہ"}${m[3] ? " آفیشل کمپنی" : ""} وارنٹی` : `${n} ${yr ? (n > 1 ? "Years" : "Year") : (n > 1 ? "Months" : "Month")}${m[3] ? " Official Company" : ""} Warranty`; };

 const DetailsBlock = ({ specs, sku, brand, weight, unit, warranty }: { specs: unknown; sku?: string; brand?: string; weight?: string; unit?: string; warranty?: string }) => {
   const { lang } = useLanguage();
   const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
   const entries = specs && typeof specs === "object" && !Array.isArray(specs) ? Object.entries(specs as Record<string, unknown>) : [];
   const hasWarrantySpec = entries.some(([k]) => /warrant/i.test(k));
   return <div className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-extrabold text-foreground">{L("Specifications", "خصوصیات")}</h2><div className="mt-3 divide-y divide-border">{[[L("Brand", "برانڈ"), brand], [L("Weight", "وزن"), weight], [L("Unit", "یونٹ"), unit], [L("Warranty", "وارنٹی"), hasWarrantySpec ? undefined : warranty], ["SKU", sku], ...entries.map(([key, value]) => [key, String(value)])].filter(([, value]) => value).map(([key, value]) => <div key={String(key)} className="flex items-center justify-between gap-4 py-2 text-xs"><span className="text-muted-foreground">{key}</span><bdi dir="auto" className="font-bold text-foreground">{/warrant|وارنٹی/i.test(String(key)) ? fmtWarranty(String(value), lang) : value}</bdi></div>)}</div></div>;
 };

 const ReviewList = ({ reviews, summary, store, shop }: { reviews: any[]; summary: { rating: number; count: number }; store: any; shop: { rating: number; count: number } }) => {
   const { lang } = useLanguage();
   const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
   const average = Number(summary.rating || 0);
   return <div className="space-y-3">
     <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div><p className="text-3xl font-black text-primary">{average ? average.toFixed(1) : L("New", "نئی")}</p><div className="flex text-primary">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`size-3.5 ${star <= Math.round(average) ? "fill-primary" : "text-muted"}`} />)}</div></div><div className="text-xs text-muted-foreground"><p className="font-bold text-foreground">{L("This item's rating", "اس چیز کی ریٹنگ")}</p><p>{summary.count} {L("item reviews", "آرا")}</p></div></div></div>
     <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-xs"><span className="font-bold text-foreground">{L("Seller", "دکان")}: {store?.name}</span><span className="flex items-center gap-1 font-bold text-primary"><Star className="size-3.5 fill-primary" />{shop.rating ? shop.rating.toFixed(1) : L("New", "نئی")} <span className="font-normal text-muted-foreground">({shop.count})</span></span></div>
      {reviews.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><Heart className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-2 text-sm font-bold text-foreground">{L("No reviews for this item yet", "ابھی اس چیز کا کوئی ریویو نہیں")}</p><p className="mt-1 text-xs text-muted-foreground">{L("Please share your review after purchase.", "خریداری کے بعد اپنی رائے ضرور دیں۔")}</p></div> : reviews.map((review) => <article key={review.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2"><div className="flex text-primary">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`size-3 ${star <= Number(review.rating) ? "fill-primary" : "text-muted"}`} />)}</div><span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span></div>{review.comment && <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>}{Array.isArray(review.photo_urls) && review.photo_urls.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{review.photo_urls.map((url: string) => <img key={url} src={url} alt="customer review" className="aspect-square rounded-lg object-cover" loading="lazy" />)}</div>}{review.video_url && <video controls preload="metadata" className="mt-3 max-h-64 w-full rounded-lg"><source src={review.video_url} /></video>}</article>)}
   </div>;
 };

export default ProductDetail;
