import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface Ad {
  id: string;
  title: string;
  brand_name: string;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
}

interface PromotionalAdsProps {
  placement: "home" | "grocery" | "restaurant" | "checkout" | "bazar";
  className?: string;
}

const PromotionalAds = ({ placement, className = "" }: PromotionalAdsProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAds = async () => {
      const placements = placement === "home" ? ["home", "restaurant", "services"] : [placement];
      const { data } = await supabase
        .from("promotional_ads")
        .select("id, title, brand_name, image_url, link_url, sort_order, placements, payment_status, start_date, end_date")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      const today = new Date().toISOString().slice(0, 10);
      const filtered = (data || []).filter((ad: any) => {
        const placementMatch = ad.placements?.some((p: string) => placements.includes(p));
        const paidForBazar = placement !== "bazar" || ad.payment_status === "paid";
        const inDateRange = placement !== "bazar" || (!ad.start_date || ad.start_date <= today) && (!ad.end_date || ad.end_date >= today);
        return placementMatch && paidForBazar && inDateRange;
      });
      setAds(filtered);
      setLoaded(true);
    };
    fetchAds();
  }, [placement]);

  if (loaded && ads.length === 0) return null;
  if (!loaded) return <div className="min-h-[170px]" />;

  return (
    <section className={`px-3 py-2 ${className}`}>
      <Carousel
        opts={{ loop: true, align: "start" }}
        plugins={[Autoplay({ delay: 3200, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {ads.map((ad) => (
            <CarouselItem key={ad.id} className="pl-2 basis-[88%] sm:basis-[48%] lg:basis-[33%]">
              <a
                href={ad.link_url || "#"}
                target={ad.link_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="relative block overflow-hidden rounded-xl border border-border/70 bg-card shadow-card transition-shadow hover:shadow-elegant"
              >
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="h-36 w-full object-cover sm:h-32" />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-gradient-primary sm:h-32">
                    <span className="text-xl font-extrabold text-primary-foreground">{ad.brand_name}</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="truncate text-sm font-bold text-foreground">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">{ad.brand_name}</p>
                </div>
                <span className="absolute right-2 top-2 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-medium text-background">AD</span>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};

export default PromotionalAds;
