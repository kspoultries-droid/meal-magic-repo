import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { tr } from "@/lib/i18n/tr";
import produce from "@/assets/grocery-slide-produce.jpg";
import ration from "@/assets/grocery-slide-ration.jpg";
import meat from "@/assets/grocery-slide-meat.jpg";

/** Grocery top slider: bright local photos with a slim glass label so the products stay visible. */
const GroceryHeroSlider = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  const rtl = tr("ltr", "rtl") === "rtl";
  const slides = [
    { key: "produce", image: produce, badge: tr("Fresh", "تازہ"), title: tr("Vegetables & fruits daily", "روزانہ تازہ سبزی و پھل"), pos: "object-center" },
    { key: "ration", image: ration, badge: tr("Ration", "راشن"), title: tr("Monthly ration: atta, ghee, daal", "ماہانہ راشن: آٹا، گھی، دال"), pos: "object-center" },
    { key: "meat", image: meat, badge: tr("Halal", "حلال"), title: tr("Fresh meat & chicken", "تازہ گوشت اور مرغی"), pos: "object-bottom" },
  ];
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect(); api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-card shadow-card">
      <Carousel setApi={setApi} opts={{ loop: true, direction: rtl ? "rtl" : "ltr" }} plugins={[autoplay.current]} dir={rtl ? "rtl" : "ltr"}>
        <CarouselContent className="ms-0">
          {slides.map((s, i) => (
            <CarouselItem key={s.key} className="ps-0">
              <button type="button" onClick={() => document.getElementById("grocery-stores")?.scrollIntoView({ behavior: "smooth" })} className="relative block w-full text-start">
                <img src={s.image} alt={s.title} width={1280} height={640} loading={i === 0 ? "eager" : "lazy"} className={`h-40 w-full object-cover sm:h-60 ${s.pos}`} />
                <span className="absolute bottom-6 start-3 flex max-w-[80%] items-center gap-1.5 rounded-full bg-card/85 py-1 pe-1 ps-1 text-foreground shadow-card backdrop-blur-md">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{s.badge}</span>
                  <span className="truncate text-xs font-bold">{s.title}</span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-3.5 rtl:rotate-180" /></span>
                </span>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((s, i) => (
          <button key={s.key} type="button" aria-label={`${i + 1}`} onClick={() => api?.scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-card/80"}`} />
        ))}
      </div>
    </div>
  );
};
export default GroceryHeroSlider;
