import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import heroFood from "@/assets/hero-food.jpg";
import { Button } from "@/components/ui/button";

interface Slide {
  title: string;
  sub: string;
  cta: string;
  to: string;
}

const slides: Slide[] = [
  { title: "پہلے آرڈر پر مفت ڈیلیوری", sub: "آج ہی آرڈر کریں", cta: "ابھی حاصل کریں", to: "/category/biryani" },
  { title: "روزانہ نئی ڈیلز اور رعایت", sub: "منتخب ریسٹورنٹس پر", cta: "ڈیلز دیکھیں", to: "/category/burgers" },
  { title: "30 منٹ میں تیز ڈیلیوری", sub: "آپ کے قریب", cta: "آرڈر کریں", to: "/category/pizza" },
];

const HeroPromo = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, []);

  const s = slides[idx];

  return (
    <section className="container mx-auto max-w-3xl px-4 pt-3">
      <Button variant="ghost"
        onClick={() => navigate(s.to)}
        className="relative flex h-36 w-full justify-between gap-0 overflow-hidden whitespace-normal rounded-lg bg-gradient-hero p-0 text-start shadow-card active:scale-[0.99] transition-transform hover:text-primary-foreground"
      >
        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 pb-7 pt-4">
          <p className="text-[11px] font-bold text-primary-foreground/80">{s.sub}</p>
          <h2 className="text-lg font-extrabold leading-snug text-primary-foreground">{s.title}</h2>
          <span className="mt-1 flex items-center gap-1 text-[12px] font-bold text-primary-foreground">
            {s.cta} <ChevronLeft className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="relative h-full w-[36%] shrink-0 sm:w-44">
          <img src={heroFood} alt="EasyLife offer" className="h-full w-full object-cover" />
        </div>

        <div className="absolute bottom-2 right-4 z-10 flex gap-1">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"}`}
            />
          ))}
        </div>
      </Button>
    </section>
  );
};

export default HeroPromo;
