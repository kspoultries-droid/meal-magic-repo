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
  if (!loaded) return <div className="min-h-[220px]" />;

  return (
    <section className={`px-3 py-3 ${className}`}>
      <Carousel
        opts={{ loop: true, align: "start" }}
        plugins={[Autoplay({ delay: 3000, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {ads.map((ad) => (
            <CarouselItem key={ad.id} className="pl-2 basis-full sm:basis-[48%] lg:basis-[33%]">
              <a
                href={ad.link_url || "#"}
                target={ad.link_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden border bg-card hover:shadow-lg transition-shadow cursor-pointer relative"
              >
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-44 sm:h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 sm:h-40 bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-primary-foreground text-xl font-extrabold">{ad.brand_name}</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold text-foreground text-sm truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">{ad.brand_name}</p>
                </div>
                <span className="absolute top-2 right-2 bg-foreground/60 text-background text-[10px] px-1.5 py-0.5 rounded font-medium">
                  AD
                </span>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};

export default PromotionalAds;
