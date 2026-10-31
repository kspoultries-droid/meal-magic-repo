import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Clock3, Heart, MapPin, Minus, Plus, Share2, ShoppingBag, Star, Store, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { recordRecent } from "@/lib/recentlyViewed";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import ProductGallery from "@/components/product/ProductGallery";
import ProductQuestions from "@/components/product/ProductQuestions";
import RelatedProducts, { type RelatedItem } from "@/components/product/RelatedProducts";
import { availableShopQuantity } from "@/lib/shopOrders";
import { toast } from "sonner";




const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, setIsOpen } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
   const [related, setRelated] = useState<RelatedItem[]>([]);
   const [reviews, setReviews] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState(new URLSearchParams(window.location.search).get("tab") || "overview");
   const [reviewSummary, setReviewSummary] = useState({ rating: 0, count: 0 });
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
         supabase.rpc("shop_public_reviews", { _store_id: productData.store_id, _limit: 20 }),
       ]);
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

  const images = useMemo(() => {
    const extra = Array.isArray(product?.images) ? product.images : [];
    return Array.from(new Set([product?.image_url, ...extra].filter(Boolean)));
  }, [product]);
  const variants = useMemo(() => {
    if (!Array.isArray(product?.variants)) return [];
    return product.variants.filter((variant: any) => variant && (variant.label || variant.name));
  }, [product]);
  const variantKey = (variant: any, index: number) => String(variant.id || variant.label || variant.name || index);
  const selectedVariant = variants.find((variant: any, index: number) => variantKey(variant, index) === selectedVariantId);
  const selectedVariantCartId = selectedVariant ? (selectedVariant.id || selectedVariant.label || null) : null;
  const basePrice = Number(product?.wholesale_price ?? product?.discount_price ?? product?.price ?? 0);
  const effectivePrice = Math.max(0, basePrice + Number(selectedVariant?.price_delta || 0));
  const hasDiscount = effectivePrice < (product?.price ?? 0);
  const discount = hasDiscount ? Math.round(((product.price - effectivePrice) / product.price) * 100) : 0;
  const cartLine = items.find((item) => item.menu_item_id === id && item.sourceId === product?.store_id && (item.variant_id || null) === selectedVariantCartId);
  const quantity = cartLine?.quantity || 0;
  const availableQuantity = availableShopQuantity(product || {}, selectedVariant);

  useEffect(() => {
    setSelectedVariantId(variants[0] ? String(variants[0].id || variants[0].label) : "");
  }, [product?.id, variants]);

  const addToCart = (): boolean => {
    if (!product || !store) return false;
    if (availableQuantity !== null && quantity >= availableQuantity) { toast.error("منتخب مقدار دستیاب نہیں"); return false; }
    const variantLabel = selectedVariant?.label || selectedVariant?.name;
      return addItem({
        id: product.id,
        name: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
        restaurant: store.name,
        price: effectivePrice,
        image: product.image_url || images[0] || "",
        source: "grocery",
        sourceId: store.id,
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
    <div className="min-h-screen bg-background px-4 py-5" aria-live="polite" aria-label="پروڈکٹ لوڈ ہو رہی ہے">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-14 rounded-2xl bg-muted animate-pulse" />
        <div className="aspect-square max-h-[430px] rounded-3xl bg-muted animate-pulse" />
        <div className="space-y-3"><div className="h-7 w-2/3 rounded-lg bg-muted animate-pulse" /><div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" /><div className="h-24 rounded-2xl bg-muted animate-pulse" /></div>
      </div>
    </div>
  );
  if (!product || !store) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><p className="text-muted-foreground">پروڈکٹ نہیں ملی</p><Button onClick={() => navigate(-1)}>واپس جائیں</Button></div>;

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Button variant="ghost" size="icon" aria-label="واپس" onClick={() => navigate(-1)}><ArrowRight className="h-5 w-5" /></Button>
          <div className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">پروڈکٹ تلاش کریں</div>
          <Button variant="ghost" size="icon" aria-label="پسندیدہ" onClick={() => setLiked((value) => !value)}><Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : ""}`} /></Button>
          <Button variant="ghost" size="icon" aria-label="کارٹ" onClick={() => setIsOpen(true)}><ShoppingBag className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <section className="overflow-hidden bg-card border-b border-border/60 sm:mt-4 sm:rounded-3xl sm:border">
          <ProductGallery images={images} name={product.name} rating={0} soldCount={Number(product.sold_count || 0)} />
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {hasDiscount && <span className="rounded-md bg-destructive px-2 py-1 text-[10px] font-extrabold text-destructive-foreground">-{discount}% آفر</span>}
                  {availableQuantity !== 0 && product.is_available && <span className="flex items-center gap-1 text-[10px] font-bold text-success"><Check className="h-3 w-3" /> {availableQuantity === null ? "دستیاب ہے" : `دستیاب: ${availableQuantity}`}</span>}
                  {availableQuantity === 0 && <span className="text-xs font-bold text-destructive">اسٹاک ختم</span>}
                </div>
                <h1 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">{product.name}</h1>
                <p className="mt-1 text-xs text-muted-foreground">{product.brand || product.category || "معیاری پروڈکٹ"}{product.unit ? ` · فی ${product.unit}` : ""}{product.weight ? ` · ${product.weight}` : ""}</p>
              </div>
              <Button variant="outline" size="icon" aria-label="شیئر کریں" onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}><Share2 className="h-4 w-4" /></Button>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-black text-primary">Rs. {effectivePrice.toLocaleString()}</span>
              {hasDiscount && <span className="text-sm text-muted-foreground line-through">Rs. {Number(product.price).toLocaleString()}</span>}
            </div>
            {product.min_order_qty > 1 && <p className="mt-2 text-xs font-bold text-destructive">کم از کم آرڈر: {product.min_order_qty} عدد</p>}
            {variants.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-foreground">سائز / رنگ منتخب کریں</p>
                  <span className="text-[10px] font-bold text-primary">لازمی</span>
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
             {[{ id: "overview", label: "جائزہ" }, { id: "details", label: "تفصیل" }, { id: "reviews", label: "ریٹنگز" }, { id: "questions", label: "سوالات" }, { id: "related", label: "ملتی جلتی اشیاء" }].map((tab) => (
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <InfoTile icon={<Truck className="h-4 w-4" />} label="ڈیلیوری" value={product.delivery_days || "1–3 دن"} />
                  <InfoTile icon={<Clock3 className="h-4 w-4" />} label="تیاری" value={store.delivery_time || "دکان کے مطابق"} />
                  <InfoTile icon={<ShoppingBag className="h-4 w-4" />} label="فروخت" value={String(product.sold_count || 0)} />
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-sm font-extrabold text-foreground">اس پروڈکٹ کے بارے میں</h2>
                  {product.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-sm leading-7 text-muted-foreground">
                      <li>{product.name}{product.brand ? ` — ${product.brand}` : ""}</li>
                      {product.weight && <li>وزن / سائز: {product.weight}</li>}
                      {product.unit && <li>یونٹ: فی {product.unit}</li>}
                      <li>قیمت: Rs. {effectivePrice.toLocaleString()}{product.min_order_qty > 1 ? ` · کم از کم ${product.min_order_qty} عدد` : ""}</li>
                      <li>{store.name} سے تصدیق شدہ، محفوظ پیکنگ کے ساتھ ڈیلیوری۔</li>
                    </ul>
                  )}
                  {Array.isArray(product.tags) && product.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{product.tags.map((tag: string) => <span key={tag} className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-accent-foreground">{tag}</span>)}</div>}
                </div>
              </>
            )}
             {activeTab === "details" && <DetailsBlock specs={product.specs} sku={product.sku} brand={product.brand} weight={product.weight} unit={product.unit} />}
             {activeTab === "reviews" && <ReviewList reviews={reviews} store={{ ...store, rating: reviewSummary.rating, review_count: reviewSummary.count }} />}
             {activeTab === "questions" && <ProductQuestions productId={product.id} storeId={store.id} storeOwnerId={store.owner_id} />}
           </section>
        )}

        <section className="mx-4 mt-3 space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-accent/50 p-4">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Truck className="h-5 w-5" /></div><div><p className="text-sm font-extrabold text-foreground">ڈیلیوری کا طریقہ</p><p className="text-xs text-muted-foreground">{store.ships_nationwide ? "ملک بھر میں کورئیر دستیاب" : "مقامی رائیڈر کے ذریعے محفوظ ڈیلیوری"}</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-accent-foreground"><span className="rounded-full bg-background px-3 py-1.5">{product.delivery_days || "1–3 دن"}</span><span className="rounded-full bg-background px-3 py-1.5">محفوظ پیکنگ</span><span className="rounded-full bg-background px-3 py-1.5">آرڈر ٹریکنگ</span></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Store className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-foreground">{store.name}</p><p className="text-xs text-muted-foreground">{store.rating ? `★ ${store.rating}` : "نئی دکان"} · تصدیق شدہ شاپ</p></div><Button variant="outline" size="sm" onClick={() => navigate(store.store_type === "wholesale" ? `/bazar/${store.id}` : `/grocery/${store.id}`)}>دکان دیکھیں <ChevronRight className="ms-1 h-3 w-3" /></Button></div>
          </div>
        </section>

        {activeTab === "related" && <RelatedProducts items={related} />}
        {activeTab !== "related" && <RelatedProducts items={related} />}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.25)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-hidden">
          {quantity > 0 && (
            <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border bg-card px-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="کم کریں" onClick={() => cartLine && updateQuantity(cartLine.id, quantity - 1)}><Minus className="h-4 w-4" /></Button>
              <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" aria-label="بڑھائیں" onClick={addToCart}><Plus className="h-4 w-4" /></Button>
            </div>
          )}
          {quantity > 0 ? (<>
            <Button variant="outline" className="h-11 min-w-0 flex-1 rounded-xl border-primary/40 px-2 text-[13px] font-extrabold text-primary shadow-sm" onClick={() => navigate(store.store_type === "wholesale" ? `/bazar/${store.id}` : `/grocery/${store.id}`)}>
              <Store className="me-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">مزید اشیاء لیں</span>
            </Button>
            <Button className="h-11 min-w-0 flex-1 rounded-xl bg-gradient-to-l from-primary to-primary/80 px-2 text-[13px] font-extrabold shadow-lg shadow-primary/25" onClick={() => navigate("/checkout")}>
              <span className="truncate">چیک آؤٹ ({items.reduce((n, i) => n + i.quantity, 0)})</span>
              <ArrowLeft className="ms-1.5 h-4 w-4 shrink-0" />
            </Button>
          </>) : (<>
          <Button variant="outline" className="h-11 min-w-0 flex-1 rounded-xl border-primary/40 px-2 text-[13px] font-extrabold text-primary shadow-sm" onClick={addToCart}>
            <ShoppingBag className="me-1.5 h-4 w-4 shrink-0" />
            <span className="truncate">کارٹ میں شامل</span>
          </Button>
          <Button className="h-11 min-w-0 flex-1 rounded-xl bg-gradient-to-l from-primary to-primary/80 px-2 text-[13px] font-extrabold shadow-lg shadow-primary/25" onClick={buyNow}>
            <span className="truncate">ابھی خریدیں</span>
            <ArrowLeft className="ms-1.5 h-4 w-4 shrink-0" />
          </Button>
          </>)}
        </div>
      </div>
    </div>
  );
};

const InfoTile = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-[10px] font-bold text-muted-foreground">{label}</span></div><p className="mt-1 text-xs font-extrabold text-foreground">{value}</p></div>;

 const DetailsBlock = ({ specs, sku, brand, weight, unit }: { specs: unknown; sku?: string; brand?: string; weight?: string; unit?: string }) => {
   const entries = specs && typeof specs === "object" && !Array.isArray(specs) ? Object.entries(specs as Record<string, unknown>) : [];
   return <div className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-extrabold text-foreground">پروڈکٹ کی تفصیل</h2><div className="mt-3 divide-y divide-border">{[["برانڈ", brand], ["وزن", weight], ["یونٹ", unit], ["SKU", sku], ...entries.map(([key, value]) => [key, String(value)])].filter(([, value]) => value).map(([key, value]) => <div key={String(key)} className="flex items-center justify-between gap-4 py-2 text-xs"><span className="text-muted-foreground">{key}</span><span className="font-bold text-foreground">{value}</span></div>)}</div></div>;
 };

 const ReviewList = ({ reviews, store }: { reviews: any[]; store: any }) => {
   const average = Number(store?.rating || 0);
   return <div className="space-y-3">
     <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div><p className="text-3xl font-black text-primary">{average ? average.toFixed(1) : "نئی"}</p><div className="flex text-primary">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`size-3.5 ${star <= Math.round(average) ? "fill-primary" : "text-muted"}`} />)}</div></div><div className="text-xs text-muted-foreground"><p className="font-bold text-foreground">{store?.name}</p><p>{store.review_count} آرا · دکان کی ریٹنگ</p></div></div></div>
     {reviews.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><Heart className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-2 text-sm font-bold text-foreground">ابھی کوئی ریٹنگ نہیں</p><p className="mt-1 text-xs text-muted-foreground">خریداری کے بعد اپنی رائے ضرور دیں۔</p></div> : reviews.map((review) => <article key={review.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2"><div className="flex text-primary">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`size-3 ${star <= Number(review.rating) ? "fill-primary" : "text-muted"}`} />)}</div><span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span></div>{review.comment && <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>}{Array.isArray(review.photo_urls) && review.photo_urls.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{review.photo_urls.map((url: string) => <img key={url} src={url} alt="customer review" className="aspect-square rounded-lg object-cover" loading="lazy" />)}</div>}{review.video_url && <video controls preload="metadata" className="mt-3 max-h-64 w-full rounded-lg"><source src={review.video_url} /></video>}</article>)}
   </div>;
 };

export default ProductDetail;
