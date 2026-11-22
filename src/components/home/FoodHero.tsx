import { tr } from "@/lib/i18n/tr";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Search, X } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";
import biryaniAsset from "@/assets/food-studio-biryani.webp.asset.json";
import karahiAsset from "@/assets/food-studio-karahi.webp.asset.json";
import bbqAsset from "@/assets/food-studio-bbq.webp.asset.json";
import { Button } from "@/components/ui/button";
import type { Ad } from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

/** Food page top banner (Bazar style): search sits on the rotating cards; paid "home" ads first, then EasyLife slides. */
const MAX_SLIDES = 8;
const foodBiryani = biryaniAsset.url;
const foodKarahi = karahiAsset.url;
const foodBbq = bbqAsset.url;
const getSlides = () => [
  { key: "s1", title: tr("Biryani & rice", "بریانی اور چاول"), to: "/category/biryani", image: foodBiryani },
  { key: "s2", title: tr("Karahi", "کڑاہی"), to: "/category/karahi", image: foodKarahi },
  { key: "s3", title: tr("Barbecue", "باربی کیو"), to: "/category/bbq", image: foodBbq },
];

const seen = new Set<string>();
const track = (id: string, kind: "view" | "click") => {
  if (kind === "view") { if (seen.has(id)) return; seen.add(id); }
  supabase.rpc("track_ad_event" as any, { _ad_id: id, _kind: kind }).then(() => {});
};

const FoodHero = ({ searchQuery, onSearchChange, hideAds }: Props) => {
  const navigate = useNavigate();
  const SLIDES = getSlides();
  const [ads, setAds] = useState<Ad[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }));
  const rtl = tr("ltr", "rtl") === "rtl";

  useEffect(() => {
    supabase.from("promotional_ads").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      const today = new Date().toISOString().slice(0, 10);
      setAds(((data || []) as any[]).filter((ad) => typeof ad.image_url === "string" && ad.image_url.trim() && ad.placements?.includes("home") && ad.payment_status === "paid"
        && (!ad.start_date || ad.start_date <= today) && (!ad.end_date || ad.end_date >= today)).slice(0, MAX_SLIDES) as Ad[]);
    });
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
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
    <div className="container mx-auto px-4 pb-2 pt-4">
      <h1 className="mb-3 text-xl font-extrabold text-foreground">{tr("EasyLife Food", "ایزی لائف فوڈ")}</h1>
      <form role="search" onSubmit={event => { event.preventDefault(); document.getElementById("food-results")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }); }} className="flex h-12 items-center gap-2 rounded-lg bg-card ps-3.5 shadow-soft ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={tr("Restaurant or dish", "ریسٹورنٹ یا ڈش تلاش کریں")} enterKeyHint="search" aria-label={tr("Search food", "کھانا تلاش کریں")} className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
        {searchQuery && <Button variant="ghost" size="icon" type="button" aria-label={tr("Clear", "صاف کریں")} onClick={() => onSearchChange("")} className="grid size-8 shrink-0 place-items-center text-muted-foreground"><X className="size-4" /></Button>}
        <Button type="submit" size="sm" className="m-1.5 h-9 px-3 text-xs font-bold">{tr("Search", "تلاش")}</Button>
      </form>
    </div>
  );

  if (hideAds) return <header>{searchBar}</header>;

  const H = "h-auto aspect-[16/8] sm:aspect-[16/6]";
  return (
    <header className="relative isolate">
      {searchBar}
      <div className="container mx-auto px-4 pt-3">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg shadow-soft">
        <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 && !reducedMotion ? [autoplay.current] : []} className="w-full">
          <CarouselContent className="ml-0">
            {ads.map((ad, i) => (
              <CarouselItem key={ad.id} className="basis-full pl-0">
                <Button variant="ghost" type="button" onClick={() => openAd(ad)} className={`relative block ${H} w-full overflow-hidden rounded-none bg-muted p-0 text-start`}>
                  {ad.image_url ? <img key={ad.image_url} src={img(ad.image_url, 1080, 78)} alt={ad.title} loading={i === 0 ? "eager" : "lazy"} decoding="async" onError={e => { if (ad.image_url && e.currentTarget.dataset.fallback !== "true") { e.currentTarget.dataset.fallback = "true"; e.currentTarget.src = ad.image_url; } }} className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 bg-gradient-hero" />}
                  {ad.show_text !== false && <>
                    <div className="absolute bottom-6 start-3 flex max-w-[78%] items-center gap-1.5 rounded-full bg-card py-1 pe-1 ps-3 text-foreground shadow-soft">
                      {ad.offer_badge && <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-destructive-foreground">{ad.offer_badge}</span>}
                      <span className="truncate text-xs font-bold">{ad.title}</span>
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-3.5 rtl:rotate-180" /></span>
                    </div>
                  </>}
                  <span className="absolute top-2 end-2 rounded bg-card/90 px-1.5 py-0.5 text-[9px] font-medium text-foreground">AD</span>
                </Button>
              </CarouselItem>
            ))}
            {slides.map((s, i) => (
              <CarouselItem key={s.key} className="basis-full pl-0">
                <Button variant="ghost" type="button" onClick={() => go(s.to)} className={`relative block ${H} w-full overflow-hidden rounded-none bg-card p-0 text-start`}>
                  <img src={s.image} alt="" width={1440} height={810} loading={i === 0 && ads.length === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />
                  <div className="absolute bottom-6 start-3 flex max-w-[78%] items-center gap-1.5 rounded-full bg-card py-1 pe-1 ps-3 text-foreground shadow-soft">
                    <span className="truncate text-xs font-bold">{s.title}</span>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-3.5 rtl:rotate-180" /></span>
                  </div>
                </Button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {total > 1 && <div dir="ltr" className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1.5">{Array.from({ length: total }).map((_, i) => <Button variant="ghost" size="icon" key={i} type="button" aria-label={`${i + 1}/${total}`} aria-current={i === current ? "true" : undefined} onClick={() => api?.scrollTo(i)} className="h-6 w-6 rounded-full p-0 hover:bg-transparent"><span className={`h-1.5 rounded-full shadow-soft transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/50"}`} /></Button>)}</div>}
      </div>
      </div>
    </header>
  );
};

export default FoodHero;
