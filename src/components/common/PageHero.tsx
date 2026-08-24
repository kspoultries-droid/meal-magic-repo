import { Search, MapPin, ChevronDown } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface PromoSlide {
  title: string;
  subtitle: string;
  emoji: string;
}

export interface HeroFeature {
  emoji: string;
  label: string;
}

interface PageHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  placeholders: string[];
  title: string;
  eyebrow?: string;
  promos: PromoSlide[];
  features?: HeroFeature[];
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
  features,
  showLocation = true,
  children,
}: PageHeroProps) => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % placeholders.length), 2600);
    return () => clearInterval(t);
  }, [placeholders.length]);

  return (
    <section className="border-b bg-background px-4 py-2 shadow-soft">
      <div className="relative container mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold leading-tight text-foreground">
              {title}
            </h1>
            {eyebrow && (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">{eyebrow}</p>
            )}
          </div>

          {showLocation && (
            <button
              onClick={() => navigate("/profile")}
              className="flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-primary shadow-soft active:scale-95 transition-transform"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">ڈیلیوری</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>

        <div
          onClick={() => document.getElementById("page-hero-search")?.focus()}
          className="flex h-11 cursor-text items-center gap-2.5 rounded-xl border bg-card px-3.5 shadow-soft focus-within:ring-2 focus-within:ring-ring"
        >
          <Search className="h-4.5 w-4.5 shrink-0 text-primary" />
          <input
            id="page-hero-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholders[idx]}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="shrink-0 text-xs text-muted-foreground">✕</button>
          )}
        </div>

        {children}
      </div>
    </section>
  );
};

export default PageHero;
