import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";

export interface Ad {
  id: string;
  title: string;
  brand_name: string;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  ad_type?: string | null;
  subtitle?: string | null;
  cta_text?: string | null;
  offer_badge?: string | null;
  promo_code?: string | null;
  price?: number | null;
  original_price?: number | null;
  show_text?: boolean | null;
}

interface PromotionalAdsProps {
  placement: "home" | "grocery" | "restaurant" | "checkout" | "bazar";
  className?: string;
  /** Built-in slides shown after paid ads (hero mode); total capped by `max`. */
  extraSlides?: { key: string; node: React.ReactNode }[];
  max?: number;
}

const seen = new Set<string>();
const track = (id: string, kind: "view" | "click") => {
  if (kind === "view") { if (seen.has(id)) return; seen.add(id); }
  supabase.rpc("track_ad_event" as any, { _ad_id: id, _kind: kind }).then(() => {});
};

export const AdSlide = ({ ad, eager, onOpen }: { ad: Ad; eager?: boolean; onOpen?: () => void }) => {
  const showText = ad.show_text !== false;
  const hasPrice = ad.price != null && Number(ad.price) > 0;
  return (
    <button type="button" onClick={onOpen} className="relative block w-full overflow-hidden rounded-2xl bg-card text-start shadow-card">
      <div className="relative aspect-[2/1] w-full">
        {ad.image_url ? (
          <img src={img(ad.image_url, 900, 75)} alt={ad.title} loading={eager ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary" />
        )}
        {showText && <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent" />}
        <span className="absolute left-2 top-2 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-medium text-background">AD</span>
        {ad.offer_badge && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2.5 py-1 text-xs font-extrabold text-destructive-foreground shadow">{ad.offer_badge}</span>
        )}
        {showText && (
          <div className="absolute inset-x-0 bottom-0 p-3 text-background">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{ad.brand_name}</p>
            <p className="line-clamp-1 text-lg font-extrabold leading-tight">{ad.title}</p>
            {ad.subtitle && <p className="line-clamp-1 text-xs opacity-90">{ad.subtitle}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {hasPrice && (
                <span className="text-sm font-extrabold">
                  Rs {Number(ad.price)}
                  {ad.original_price && Number(ad.original_price) > Number(ad.price) && (
                    <span className="ms-1.5 text-xs font-medium line-through opacity-75">Rs {Number(ad.original_price)}</span>
                  )}
                </span>
              )}
              {ad.promo_code && (
                <span className="rounded border border-dashed border-background/80 px-1.5 py-0.5 text-[11px] font-bold">کوڈ: {ad.promo_code}</span>
              )}
              {(ad.cta_text || ad.link_url) && (
                <span className="ms-auto rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{ad.cta_text || "ابھی دیکھیں"}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

const PromotionalAds = ({ placement, className = "", extraSlides = [], max = 8 }: PromotionalAdsProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const rtl = typeof document !== "undefined" && getComputedStyle(document.documentElement).direction === "rtl";
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  useEffect(() => {
    const fetchAds = async () => {
      const placements = placement === "home" ? ["home", "restaurant", "services"] : [placement];
      const { data } = await supabase
        .from("promotional_ads")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      const today = new Date().toISOString().slice(0, 10);
      const filtered = (data || []).filter((ad: any) => {
        const placementMatch = ad.placements?.some((p: string) => placements.includes(p));
        const paidForBazar = placement !== "bazar" || ad.payment_status === "paid";
        const inDateRange = (!ad.start_date || ad.start_date <= today) && (!ad.end_date || ad.end_date >= today);
        return placementMatch && paidForBazar && inDateRange;
      });
      setAds((filtered as Ad[]).slice(0, max));
      setLoaded(true);
    };
    fetchAds();
  }, [placement]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  useEffect(() => { const ad = ads[current]; if (ad) track(ad.id, "view"); }, [current, ads]);

  const open = (ad: Ad) => {
    track(ad.id, "click");
    if (ad.promo_code) navigator.clipboard?.writeText(ad.promo_code).then(() => toast.success(`کوڈ ${ad.promo_code} کاپی ہو گیا`)).catch(() => {});
    const link = ad.link_url?.trim();
    if (!link) return;
    if (link.startsWith("/")) navigate(link);
    else window.open(link, "_blank", "noopener,noreferrer");
  };

  const extras = extraSlides.slice(0, Math.max(0, max - ads.length));
  const total = ads.length + extras.length;
  if (loaded && total === 0) return null;
  if (!loaded) return <div className={`px-3 py-2 ${className}`}><div className="aspect-[2/1] w-full animate-pulse rounded-2xl bg-muted" /></div>;

  return (
    <section className={`px-3 py-2 ${className}`}>
      <Carousel setApi={setApi} dir={rtl ? "rtl" : "ltr"} opts={{ loop: total > 1, align: "start", direction: rtl ? "rtl" : "ltr" }} plugins={total > 1 ? [autoplay.current] : []} className="w-full">
        <CarouselContent className="-ml-2">
          {ads.map((ad, i) => (
            <CarouselItem key={ad.id} className="basis-full pl-2 md:basis-1/2 lg:basis-1/3">
              <AdSlide ad={ad} eager={i === 0} onOpen={() => open(ad)} />
            </CarouselItem>
          ))}
          {extras.map((x) => (
            <CarouselItem key={x.key} className="basis-full pl-2 md:basis-1/2 lg:basis-1/3">{x.node}</CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {total > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {[...ads.map((a) => a.id), ...extras.map((x) => x.key)].map((id, i) => (
            <button key={id} type="button" aria-label={`ایڈ ${i + 1}`} onClick={() => api?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PromotionalAds;
