import { tr } from "@/lib/i18n/tr";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { Search, X } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";
import foodBiryani from "@/assets/food-biryani.jpg";
import foodKarahi from "@/assets/food-karahi.jpg";
import foodBbq from "@/assets/food-bbq.jpg";
import type { Ad } from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

/** Food page top banner (Bazar style): search sits on the rotating cards; paid "home" ads first, then EasyLife slides. */
const MAX_SLIDES = 8;
const getSlides = () => [
  { key: "s1", eyebrow: tr("Order today", "آج ہی آرڈر کریں"), title: tr("Free delivery on your first order", "پہلے آرڈر پر مفت ڈیلیوری"), cta: tr("Get it now", "ابھی حاصل کریں"), to: "/category/biryani", image: foodBiryani },
  { key: "s2", eyebrow: tr("At selected restaurants", "منتخب ریسٹورنٹس پر"), title: tr("New deals and discounts daily", "روزانہ نئی ڈیلز اور رعایت"), cta: tr("View deals", "ڈیلز دیکھیں"), to: "/category/burgers", image: foodKarahi },
  { key: "s3", eyebrow: tr("Near you", "آپ کے قریب"), title: tr("Fast delivery in 30 minutes", "30 منٹ میں تیز ڈیلیوری"), cta: tr("Order now", "آرڈر کریں"), to: "/category/pizza", image: foodBbq },
];
const getPlaceholders = () => [tr("What would you like to eat?", "آج کیا کھانے کا دل ہے؟"), tr("Biryani, pizza or burgers?", "بریانی، پیزا یا برگر؟"), tr("Find nearby restaurants…", "قریبی ریسٹورنٹس تلاش کریں…")];

const seen = new Set<string>();
const track = (id: string, kind: "view" | "click") => {
  if (kind === "view") { if (seen.has(id)) return; seen.add(id); }
  supabase.rpc("track_ad_event" as any, { _ad_id: id, _kind: kind }).then(() => {});
};

const FoodHero = ({ searchQuery, onSearchChange, hideAds }: Props) => {
  const navigate = useNavigate();
  const SLIDES = getSlides();
  const PLACEHOLDERS = getPlaceholders();
  const [ads, setAds] = useState<Ad[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [ph, setPh] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  const rtl = tr("ltr", "rtl") === "rtl";

  useEffect(() => {
    supabase.from("promotional_ads").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      const today = new Date().toISOString().slice(0, 10);
      setAds(((data || []) as any[]).filter((ad) => ad.placements?.includes("home") && ad.payment_status === "paid"
        && (!ad.start_date || ad.start_date <= today) && (!ad.end_date || ad.end_date >= today)).slice(0, MAX_SLIDES) as Ad[]);
    });
  }, []);
  useEffect(() => { const t = setInterval(() => setPh((n) => (n + 1) % PLACEHOLDERS.length), 3000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect(); api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const slides = SLIDES.slice(0, Math.max(0, MAX_SLIDES - ads.length));
  const total = ads.length + slides.length;
  useEffect(() => { const ad = ads[current]; if (ad) track(ad.id, "view"); }, [current, ads]);

  const go = (l?: string | null) => {
    const link = l?.trim(); if (!link) return;
    if (link.startsWith("/")) navigate(link); else window.open(link, "_blank", "noopener,noreferrer");
  };
  const openAd = (ad: Ad) => {
    track(ad.id, "click");
    if (ad.promo_code) navigator.clipboard?.writeText(ad.promo_code).then(() => toast.success(tr(`Code ${ad.promo_code} copied`, `کوڈ ${ad.promo_code} کاپی ہو گیا`))).catch(() => {});
    go(ad.link_url);
  };

  const searchBar = (
    <div className="bg-gradient-hero px-3 pb-3 pt-2">
      <label className="mx-auto flex h-12 max-w-3xl items-center gap-2 rounded-2xl bg-card ps-3.5 shadow-elegant ring-1 ring-border/60 focus-within:ring-2 focus-within:ring-primary">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={PLACEHOLDERS[ph]} enterKeyHint="search" aria-label={tr("Search food", "کھانا تلاش کریں")} className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
        {searchQuery && <button type="button" aria-label={tr("Clear", "صاف کریں")} onClick={() => onSearchChange("")} className="grid size-8 place-items-center text-muted-foreground"><X className="size-4" /></button>}
        <span className="m-1.5 grid h-9 place-items-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">{tr("Search", "تلاش")}</span>
      </label>
    </div>
  );

  if (hideAds) return <header>{searchBar}</header>;

  const H = "h-44 sm:h-64";
  return (
    <header className="relative isolate">
      {searchBar}
      <div className="container mx-auto px-3 pt-3">
      <div className="relative overflow-hidden rounded-2xl shadow-card">
        <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 ? [autoplay.current] : []} className="w-full">
          <CarouselContent className="ml-0">
            {ads.map((ad, i) => (
              <CarouselItem key={ad.id} className="basis-full pl-0">
                <button type="button" onClick={() => openAd(ad)} className={`relative block ${H} w-full overflow-hidden bg-muted text-start`}>
                  {ad.image_url ? <img src={img(ad.image_url, 1080, 78)} alt={ad.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 bg-gradient-hero" />}
                  {ad.show_text !== false && <>
                    <div className="absolute bottom-4 start-3 max-w-[70%] rounded-2xl bg-card/90 p-3 text-foreground shadow-card">
                      {ad.offer_badge && <span className="mb-1 inline-block rounded-full bg-destructive px-2.5 py-0.5 text-xs font-extrabold text-destructive-foreground">{ad.offer_badge}</span>}
                      <p className="text-[11px] font-semibold opacity-90">{ad.brand_name}</p>
                      <p className="line-clamp-2 text-xl font-extrabold leading-tight">{ad.title}</p>
                      <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{ad.cta_text || tr("View now", "ابھی دیکھیں")}</span>
                    </div>
                  </>}
                  <span className="absolute bottom-3 start-3 rounded bg-card/90 px-1.5 py-0.5 text-[9px] font-medium text-foreground">AD</span>
                </button>
              </CarouselItem>
            ))}
            {slides.map((s) => (
              <CarouselItem key={s.key} className="basis-full pl-0">
                <button type="button" onClick={() => go(s.to)} className={`relative block ${H} w-full overflow-hidden bg-muted text-start`}>
                  <img src={s.image} alt="" width={1024} height={640} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                  <div className="absolute bottom-5 start-3 max-w-[70%] rounded-2xl bg-card/90 p-3 text-foreground shadow-card">
                    <p className="text-xs font-bold opacity-90">{s.eyebrow}</p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-extrabold leading-tight">{s.title}</p>
                    <span className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">{s.cta}</span>
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {total > 1 && <div dir="ltr" className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">{Array.from({ length: total }).map((_, i) => <button key={i} type="button" aria-label={`${i + 1}/${total}`} onClick={() => api?.scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-card" : "w-1.5 bg-card/60"}`} />)}</div>}
      </div>
      </div>
    </header>
  );
};

export default FoodHero;
