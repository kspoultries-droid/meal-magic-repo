import { tr } from "@/lib/i18n/tr";
import { displayText } from "@/lib/i18n/displayText";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Truck, X, type LucideIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import HeroEditor from "@/components/common/HeroEditor";
import BazarSlidesManager from "@/components/wholesale/BazarSlidesManager";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { bazarHeroDefaults } from "@/lib/heroConfig";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";
import type { Ad } from "@/components/PromotionalAds";
import { visibleBazarCards } from "@/lib/bazarCards";
import { Button } from "@/components/ui/button";
import slideFashion from "@/assets/bazar-slide-fashion.jpg";
import slideElectronics from "@/assets/bazar-slide-electronics.jpg";
import slideWholesale from "@/assets/bazar-slide-wholesale.jpg";

const HOUSE_SLIDES = () => [
  { id: "house-wholesale", title: tr("Wholesale rates for shops", "دکانوں کے لیے ہول سیل ریٹ"), offer_badge: tr("Bulk", "ہول سیل"), image_url: slideWholesale, link_url: "#bazar-feed", show_text: true },
  { id: "house-fashion", title: tr("Fashion & clothing", "فیشن اور کپڑے"), offer_badge: tr("New", "نیا"), image_url: slideFashion, link_url: "#bazar-feed", show_text: true },
  { id: "house-electronics", title: tr("Mobiles & electronics", "موبائل اور الیکٹرانکس"), offer_badge: tr("Deals", "ڈیلز"), image_url: slideElectronics, link_url: "#bazar-feed", show_text: true },
] as unknown as Ad[];

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

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
  const rtl = tr("ltr", "rtl") === "rtl";

  const [reload, setReload] = useState(0);
  useEffect(() => {
    supabase.from("promotional_ads").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      const real = visibleBazarCards((data || []) as Ad[]); setAds(real.length >= 3 ? real : [...real, ...HOUSE_SLIDES().slice(0, 3 - real.length + (real.length ? 0 : 0))]);
    });
  }, [reload]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect(); api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const total = ads.length;
  useEffect(() => { const ad = ads[current]; if (ad && !ad.id.startsWith("house-")) track(ad.id, "view"); }, [current, ads]);

  const go = (link?: string | null) => {
    const l = link?.trim(); if (!l) return;
    if (l.startsWith("#")) document.getElementById(l.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (l.startsWith("/")) navigate(l);
    else window.open(l, "_blank", "noopener,noreferrer");
  };
  const openAd = (ad: Ad) => {
    if (!ad.id.startsWith("house-")) track(ad.id, "click");
    if (ad.promo_code) navigator.clipboard?.writeText(ad.promo_code).then(() => toast.success(tr(`Code ${ad.promo_code} copied`, `کوڈ ${ad.promo_code} کاپی ہو گیا`))).catch(() => {});
    go(ad.link_url);
  };

  if (!loaded) return <header aria-busy="true" aria-label={tr("Bazar", "بازار")} className="h-[calc(15rem+env(safe-area-inset-top,0px))] bg-background" />;

  const searchBar = (
    <div className="flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:px-6">
      <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-card-foreground shadow-soft focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-primary" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={displayText(config.searchPlaceholder)} enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        {searchQuery && <button type="button" aria-label={tr("Clear", "صاف کریں")} onClick={() => onSearchChange("")} className="grid size-7 place-items-center rounded-full bg-muted"><X className="size-3.5" /></button>}
      </label>
      {isAdmin && <BazarSlidesManager onChanged={() => setReload((n) => n + 1)} extra={<HeroEditor config={config} defaults={bazarHeroDefaults} onSave={save} />} />}
    </div>
  );

  if (hideAds || total === 0) return <header className="bg-background">{searchBar}</header>;

  const pill = (title: string, badge?: string | null) => (
    <span className="absolute bottom-6 start-3 flex max-w-[80%] items-center gap-1.5 rounded-full bg-card/85 py-1 pe-1 ps-3 text-foreground shadow-card backdrop-blur-md">
      {badge && <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-destructive-foreground">{badge}</span>}
      <span className="truncate text-xs font-bold">{title}</span>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-3.5 rtl:rotate-180" /></span>
    </span>
  );

  return (
    <header className="bg-background">
      {searchBar}
      <div className="relative mx-3 overflow-hidden rounded-2xl shadow-card sm:mx-6">
        <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 ? [autoplay.current] : []} className="w-full">
          <CarouselContent className="ml-0">
            {ads.map((ad, i) => (
              <CarouselItem key={ad.id} className="basis-full pl-0">
                <Button type="button" onClick={() => openAd(ad)} variant="ghost" className="h-auto rounded-none p-0 relative block aspect-[9/5] max-h-80 w-full overflow-hidden bg-muted text-start">
                  {ad.image_url ? <><img src={ad.id.startsWith("house-") ? ad.image_url : img(ad.image_url, 400, 40)} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-xl" /><img src={ad.id.startsWith("house-") ? ad.image_url : img(ad.image_url, 1080, 78)} alt={ad.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-contain" onError={() => setAds(previous => previous.filter(item => item.id !== ad.id))} /></> : null}
                  {ad.show_text !== false && pill(ad.title, ad.offer_badge)}
                  {!ad.id.startsWith("house-") && <span className="absolute end-2 top-2 rounded bg-card/90 px-1.5 py-0.5 text-[9px] font-medium text-foreground">AD</span>}
                  {total > 1 && <span dir="ltr" className="absolute start-2 top-2 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] font-bold text-background">{i + 1}/{total}</span>}
                </Button>
              </CarouselItem>
            ))}

          </CarouselContent>
        </Carousel>
        {total > 1 && <div dir="ltr" className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">{Array.from({ length: total }).map((_, i) => <button type="button" key={i} aria-label={`${i + 1}`} onClick={() => api?.scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-primary" : "w-1.5 bg-card/80"}`} />)}</div>}
      </div>
      {config.showBadges && (
        <div className="no-scrollbar mx-3 mt-2 flex gap-2 overflow-x-auto text-[11px] font-semibold text-foreground sm:mx-6">
          {[[ShieldCheck, config.badge1], [Truck, config.badge2], [BadgeCheck, config.badge3]].map(([Icon, label], i) => { const I = Icon as LucideIcon; return <span key={i} className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5"><I className="size-3.5 text-primary" /> {displayText(label as string)}</span>; })}
        </div>
      )}
    </header>
  );
};

export default BazarHero;
