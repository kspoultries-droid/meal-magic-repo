import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { Bike, Flame, Search, Star, Timer, X } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";
import heroFood from "@/assets/hero-food.jpg";
import type { Ad } from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

/** Food page top banner (Bazar style): search sits on the rotating cards; paid "home" ads first, then EasyLife slides. */
const MAX_SLIDES = 8;
const SLIDES = [
  { key: "s1", eyebrow: "آج ہی آرڈر کریں", title: "پہلے آرڈر پر مفت ڈیلیوری", cta: "ابھی حاصل کریں", to: "/category/biryani" },
  { key: "s2", eyebrow: "منتخب ریسٹورنٹس پر", title: "روزانہ نئی ڈیلز اور رعایت", cta: "ڈیلز دیکھیں", to: "/category/burgers" },
  { key: "s3", eyebrow: "آپ کے قریب", title: "30 منٹ میں تیز ڈیلیوری", cta: "آرڈر کریں", to: "/category/pizza" },
];
const PLACEHOLDERS = ["آج کیا کھانے کا دل ہے؟", "بریانی، پیزا یا برگر؟", "قریبی ریسٹورنٹس تلاش کریں…"];

const seen = new Set<string>();
const track = (id: string, kind: "view" | "click") => {
  if (kind === "view") { if (seen.has(id)) return; seen.add(id); }
  supabase.rpc("track_ad_event" as any, { _ad_id: id, _kind: kind }).then(() => {});
};

const FoodHero = ({ searchQuery, onSearchChange, hideAds }: Props) => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [ph, setPh] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  const rtl = typeof document !== "undefined" && getComputedStyle(document.documentElement).direction === "rtl";

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
    if (ad.promo_code) navigator.clipboard?.writeText(ad.promo_code).then(() => toast.success(`کوڈ ${ad.promo_code} کاپی ہو گیا`)).catch(() => {});
    go(ad.link_url);
  };

  const searchBar = (
    <div className="absolute inset-x-0 top-0 z-20 px-3 pt-3">
      <label className="flex h-11 items-center gap-2 rounded-xl border-2 border-primary bg-card ps-3 shadow-elegant">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={PLACEHOLDERS[ph]} enterKeyHint="search" aria-label="کھانا تلاش کریں" className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
        {searchQuery && <button type="button" aria-label="صاف کریں" onClick={() => onSearchChange("")} className="grid size-8 place-items-center text-muted-foreground"><X className="size-4" /></button>}
        <span className="m-1 grid h-8 place-items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">تلاش</span>
      </label>
    </div>
  );

  if (hideAds) return <header className="relative h-[4.25rem] bg-gradient-hero">{searchBar}</header>;

  const H = "h-56 sm:h-72";
  return (
    <header className="relative isolate">
      {searchBar}
      <div className="relative">
        <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 ? [autoplay.current] : []} className="w-full">
          <CarouselContent className="ml-0">
            {ads.map((ad, i) => (
              <CarouselItem key={ad.id} className="basis-full pl-0">
                <button type="button" onClick={() => openAd(ad)} className={`relative block ${H} w-full overflow-hidden bg-muted text-start`}>
                  {ad.image_url ? <img src={img(ad.image_url, 1080, 78)} alt={ad.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 bg-gradient-hero" />}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/40 to-transparent" />
                  {ad.show_text !== false && <>
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/80 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 pb-5 text-background">
                      {ad.offer_badge && <span className="mb-1 inline-block rounded-full bg-destructive px-2.5 py-0.5 text-xs font-extrabold text-destructive-foreground">{ad.offer_badge}</span>}
                      <p className="text-[11px] font-semibold opacity-90">{ad.brand_name}</p>
                      <p className="line-clamp-2 text-xl font-extrabold leading-tight">{ad.title}</p>
                      <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{ad.cta_text || "ابھی دیکھیں"}</span>
                    </div>
                  </>}
                  <span className="absolute bottom-3 start-3 rounded bg-foreground/50 px-1.5 py-0.5 text-[9px] font-medium text-background">AD</span>
                </button>
              </CarouselItem>
            ))}
            {slides.map((s) => (
              <CarouselItem key={s.key} className="basis-full pl-0">
                <button type="button" onClick={() => go(s.to)} className={`relative block ${H} w-full overflow-hidden bg-gradient-hero text-start`}>
                  <img src={heroFood} alt="" loading="lazy" decoding="async" className="absolute inset-y-0 end-0 h-full w-1/2 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/60 to-primary rtl:bg-gradient-to-r" />
                  <div className="absolute inset-x-0 bottom-0 max-w-[62%] p-4 pb-6 text-primary-foreground">
                    <p className="text-xs font-bold opacity-90">{s.eyebrow}</p>
                    <p className="mt-1 font-display text-2xl font-extrabold leading-tight">{s.title}</p>
                    <span className="mt-3 inline-block rounded-full bg-card px-4 py-1.5 text-xs font-bold text-primary">{s.cta}</span>
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {total > 1 && <span dir="ltr" className="absolute bottom-3 end-3 z-10 rounded-full bg-foreground/50 px-2 py-0.5 text-[11px] font-bold text-background">{current + 1}/{total}</span>}
      </div>
      <div className="flex h-9 items-center justify-around bg-foreground/85 px-2 text-[11px] font-semibold text-background">
        <span className="flex items-center gap-1"><Bike className="size-3.5" /> تیز ڈیلیوری</span>
        <span className="flex items-center gap-1"><Timer className="size-3.5" /> 30 منٹ</span>
        <span className="flex items-center gap-1"><Flame className="size-3.5" /> روزانہ ڈیلز</span>
        <span className="flex items-center gap-1"><Star className="size-3.5" /> ٹاپ ریٹڈ</span>
      </div>
    </header>
  );
};

export default FoodHero;
