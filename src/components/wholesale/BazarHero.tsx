import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { BadgeCheck, Gift, Search, ShieldCheck, Store, Truck, Video, X, type LucideIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import HeroEditor from "@/components/common/HeroEditor";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { bazarHeroDefaults, heroBackgroundStyle } from "@/lib/heroConfig";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";
import type { Ad } from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

/** Daraz-style top banner: up to 15 slides, paid "bazar_top" ads first, then EasyLife feature slides. */
const MAX_SLIDES = 15;

type Feature = { key: string; icon: LucideIcon; eyebrow: string; title: string; cta: string; link: string };
const FEATURES: Feature[] = [
  { key: "f-deals", icon: Gift, eyebrow: "EasyLife آفرز", title: "واؤچر جمع کریں، زیادہ بچت کریں", cta: "واؤچر دیکھیں", link: "#bazar-deals" },
  { key: "f-ship", icon: Truck, eyebrow: "ملک بھر میں ڈیلیوری", title: "کراچی کی ہول سیل مارکیٹ اب آپ کے شہر میں", cta: "ابھی خریدیں", link: "#bazar-shops" },
  { key: "f-verified", icon: BadgeCheck, eyebrow: "تصدیق شدہ دکاندار", title: "براہِ راست دکان سے، بہتر قیمت پر", cta: "دکانیں دیکھیں", link: "#bazar-shops" },
  { key: "f-sell", icon: Store, eyebrow: "اپنی دکان لگائیں", title: "EasyLife بازار پر اپنا مال بیچیں", cta: "رجسٹر کریں", link: "/partner" },
  { key: "f-reels", icon: Video, eyebrow: "نئی ویڈیوز", title: "دکانوں کی ریلز دیکھ کر خریداری کریں", cta: "ریلز دیکھیں", link: "/reels" },
];

const seen = new Set<string>();
const track = (id: string, kind: "view" | "click") => {
  if (kind === "view") { if (seen.has(id)) return; seen.add(id); }
  supabase.rpc("track_ad_event" as any, { _ad_id: id, _kind: kind }).then(() => {});
};

const BazarHero = ({ searchQuery, onSearchChange, hideAds }: Props) => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { config, loaded, save } = useHeroSettings("hero_bazar", bazarHeroDefaults);
  const [ads, setAds] = useState<Ad[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  const rtl = typeof document !== "undefined" && getComputedStyle(document.documentElement).direction === "rtl";

  useEffect(() => {
    supabase.from("promotional_ads").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      const today = new Date().toISOString().slice(0, 10);
      setAds(((data || []) as any[]).filter((ad) => ad.placements?.includes("bazar_top") && ad.payment_status === "paid"
        && (!ad.start_date || ad.start_date <= today) && (!ad.end_date || ad.end_date >= today)).slice(0, MAX_SLIDES) as Ad[]);
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect(); api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const features = FEATURES.slice(0, Math.max(0, MAX_SLIDES - ads.length));
  const total = ads.length + features.length;
  useEffect(() => { const ad = ads[current]; if (ad) track(ad.id, "view"); }, [current, ads]);

  const go = (link?: string | null) => {
    const l = link?.trim(); if (!l) return;
    if (l.startsWith("#")) document.getElementById(l.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (l.startsWith("/")) navigate(l);
    else window.open(l, "_blank", "noopener,noreferrer");
  };
  const openAd = (ad: Ad) => {
    track(ad.id, "click");
    if (ad.promo_code) navigator.clipboard?.writeText(ad.promo_code).then(() => toast.success(`کوڈ ${ad.promo_code} کاپی ہو گیا`)).catch(() => {});
    go(ad.link_url);
  };

  if (!loaded) return <header aria-busy="true" aria-label="بازار" className="h-[calc(15rem+env(safe-area-inset-top,0px))] bg-muted" />;

  const searchBar = (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-primary bg-card ps-3 shadow-elegant">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={config.searchPlaceholder} enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
        {searchQuery && <button type="button" aria-label="صاف کریں" onClick={() => onSearchChange("")} className="grid size-8 place-items-center text-muted-foreground"><X className="size-4" /></button>}
        <span className="m-1 grid h-8 place-items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">تلاش</span>
      </label>
      {isAdmin && <HeroEditor config={config} defaults={bazarHeroDefaults} onSave={save} />}
    </div>
  );

  // While searching, keep only the search bar so results sit directly underneath.
  if (hideAds) {
    return <header className="relative h-[calc(3.75rem+env(safe-area-inset-top,0px))]" style={heroBackgroundStyle(config)}>{searchBar}</header>;
  }

  return (
    <header className="relative isolate">
      {searchBar}
      <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 ? [autoplay.current] : []} className="w-full">
        <CarouselContent className="ml-0">
          {ads.map((ad, i) => (
            <CarouselItem key={ad.id} className="basis-full pl-0">
              <button type="button" onClick={() => openAd(ad)} className="relative block h-[calc(15rem+env(safe-area-inset-top,0px))] w-full overflow-hidden bg-muted text-start sm:h-80">
                {ad.image_url ? <img src={img(ad.image_url, 1080, 78)} alt={ad.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0" style={heroBackgroundStyle(config)} />}
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
          {features.map((f) => (
            <CarouselItem key={f.key} className="basis-full pl-0">
              <button type="button" onClick={() => go(f.link)} style={heroBackgroundStyle(config)} className="relative block h-[calc(15rem+env(safe-area-inset-top,0px))] w-full overflow-hidden text-start sm:h-80">
                <span className="absolute -end-10 bottom-0 size-48 rounded-full bg-background/10" />
                <span className="absolute end-6 bottom-8 grid size-24 place-items-center rounded-3xl bg-background/15 backdrop-blur-sm"><f.icon className="size-12" style={{ color: config.accentColor }} /></span>
                <div className="absolute inset-x-0 bottom-0 max-w-[65%] p-4 pb-6">
                  <p className="text-xs font-bold" style={{ color: config.accentColor }}>{f.eyebrow}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold leading-tight">{f.title}</p>
                  <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold text-foreground" style={{ background: config.accentColor }}>{f.cta}</span>
                </div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {total > 1 && <span dir="ltr" className="absolute bottom-3 end-3 z-10 rounded-full bg-foreground/50 px-2 py-0.5 text-[11px] font-bold text-background">{current + 1}/{total}</span>}
      {config.showBadges && (
        <div className="flex h-9 items-center justify-around bg-foreground/85 px-2 text-[11px] font-semibold text-background">
          <span className="flex items-center gap-1"><ShieldCheck className="size-3.5" /> {config.badge1}</span>
          <span className="flex items-center gap-1"><Truck className="size-3.5" /> {config.badge2}</span>
          <span className="flex items-center gap-1"><BadgeCheck className="size-3.5" /> {config.badge3}</span>
        </div>
      )}
    </header>
  );
};

export default BazarHero;
