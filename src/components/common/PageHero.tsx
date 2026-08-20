import { Search, MapPin, ChevronDown, Heart, Sparkles } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface PromoSlide {
  title: string;
  subtitle: string;
  emoji: string;
}

interface PageHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  placeholders: string[];
  title: string;
  eyebrow?: string;
  promos: PromoSlide[];
  showLocation?: boolean;
  children?: ReactNode;
}

const PageHero = ({
  searchQuery,
  onSearchChange,
  placeholders,
  title,
  eyebrow,
  promos,
  showLocation = true,
  children,
}: PageHeroProps) => {
  const [idx, setIdx] = useState(0);
  const [promoIdx, setPromoIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % placeholders.length), 2600);
    return () => clearInterval(t);
  }, [placeholders.length]);

  useEffect(() => {
    if (promos.length < 2) return;
    const t = setInterval(() => setPromoIdx((i) => (i + 1) % promos.length), 3800);
    return () => clearInterval(t);
  }, [promos.length]);

  const promo = promos[promoIdx];

  return (
    <section className="relative overflow-hidden bg-gradient-hero px-4 pt-3 pb-4">
      {/* soft glow accents */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary-foreground/5 blur-3xl" />

      <div className="relative container mx-auto max-w-3xl">
        {/* Brand + location row */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h1 className="text-primary-foreground font-extrabold text-lg leading-none tracking-tight truncate">
              {title}
            </h1>
            {eyebrow && (
              <p className="text-[10px] text-primary-foreground/75 leading-none mt-1.5 truncate">{eyebrow}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showLocation && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-1 text-primary-foreground/95 bg-primary-foreground/10 rounded-full px-2.5 py-1.5 active:scale-95 transition-transform"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-[11px] font-bold">ڈیلیوری</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => navigate("/profile")}
              className="p-1.5 text-primary-foreground/90 active:scale-95 transition-transform"
              aria-label="Favourites"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          onClick={() => document.getElementById("page-hero-search")?.focus()}
          className="flex items-center gap-3 bg-card rounded-full px-4 py-3 shadow-elegant cursor-text"
        >
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            id="page-hero-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholders[idx]}
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="text-muted-foreground text-xs shrink-0">✕</button>
          )}
        </div>

        {/* Promo ribbon */}
        {promo && (
          <div
            key={promoIdx}
            className="animate-fade-in mt-3 flex items-center gap-3 rounded-2xl bg-primary-foreground/12 backdrop-blur-md border border-primary-foreground/20 px-3 py-2.5"
          >
            <span className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-lg shrink-0">
              {promo.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-primary-foreground text-xs font-extrabold truncate">{promo.title}</p>
              <p className="text-primary-foreground/75 text-[10px] truncate">{promo.subtitle}</p>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-primary-foreground/90 bg-primary-foreground/15 rounded-full px-2 py-1 shrink-0">
              <Sparkles className="w-3 h-3" /> EasyLife
            </span>
          </div>
        )}

        {children}
      </div>
    </section>
  );
};

export default PageHero;
