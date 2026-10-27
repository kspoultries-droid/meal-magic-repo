import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import heroFood from "@/assets/hero-food.jpg";
import PromotionalAds from "@/components/PromotionalAds";

const slides = [
  { title: "پہلے آرڈر پر مفت ڈیلیوری", sub: "آج ہی آرڈر کریں", cta: "ابھی حاصل کریں", to: "/category/biryani" },
  { title: "روزانہ نئی ڈیلز اور رعایت", sub: "منتخب ریسٹورنٹس پر", cta: "ڈیلز دیکھیں", to: "/category/burgers" },
  { title: "30 منٹ میں تیز ڈیلیوری", sub: "آپ کے قریب", cta: "آرڈر کریں", to: "/category/pizza" },
];

/** Food page hero: rotates up to 8 cards — paid home ads first, then EasyLife slides. */
const HeroPromo = () => {
  const navigate = useNavigate();
  const extraSlides = slides.map((s) => ({
    key: s.to,
    node: (
      <button type="button" onClick={() => navigate(s.to)} className="relative flex aspect-[2/1] w-full overflow-hidden rounded-2xl bg-gradient-hero text-start shadow-card">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
          <p className="text-[11px] font-bold text-primary-foreground/80">{s.sub}</p>
          <h2 className="text-lg font-extrabold leading-snug text-primary-foreground">{s.title}</h2>
          <span className="mt-1 flex items-center gap-1 text-xs font-bold text-primary-foreground">{s.cta} <ChevronLeft className="size-3.5" /></span>
        </div>
        <img src={heroFood} alt="" className="h-full w-[38%] shrink-0 object-cover" />
      </button>
    ),
  }));
  return <PromotionalAds placement="home" extraSlides={extraSlides} max={8} className="container mx-auto max-w-3xl pt-3" />;
};

export default HeroPromo;
