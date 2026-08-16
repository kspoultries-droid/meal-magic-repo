import { Search, MapPin, ChevronDown, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const rotating = [
  "بریانی تلاش کریں…",
  "پیزا تلاش کریں…",
  "گروسری تلاش کریں…",
  "بی بی کیو تلاش کریں…",
  "برگر تلاش کریں…",
];

interface HomeHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const HomeHero = ({ searchQuery, onSearchChange }: HomeHeroProps) => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % rotating.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative bg-gradient-hero px-4 pb-8 pt-2 overflow-hidden">
      {/* soft glow orbs */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary-foreground/10 blur-3xl" />

      <div className="relative container mx-auto max-w-3xl">
        {/* Location row */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-primary-foreground/90 mb-3 active:scale-95 transition-transform"
        >
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wide">ڈیلیوری کہاں کرنی ہے؟</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <h1 className="text-primary-foreground text-2xl sm:text-3xl font-extrabold leading-snug mb-1">
          کھانا، گروسری اور سروسز — سب ایک ایپ میں
        </h1>
        <p className="text-primary-foreground/80 text-xs sm:text-sm mb-4">
          منٹوں میں آرڈر کریں، تیز ڈیلیوری پائیں
        </p>

        {/* Search */}
        <div
          onClick={() => document.getElementById("home-search")?.focus()}
          className="flex items-center gap-3 bg-card/95 backdrop-blur-md rounded-2xl px-4 py-3.5 shadow-elegant border border-white/25 cursor-text"
        >
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            id="home-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={rotating[idx]}
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        {/* Live stats strip */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {[
            { icon: Clock, label: "25-40 منٹ ڈیلیوری" },
            { icon: MapPin, label: "کراچی • رحیم یار خان" },
          ].map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-primary-foreground bg-primary-foreground/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5"
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
