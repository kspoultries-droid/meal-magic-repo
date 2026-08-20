import { Search, MapPin, ChevronDown, Heart } from "lucide-react";
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
    <section className="bg-gradient-hero px-4 pt-3 pb-4">
      <div className="container mx-auto max-w-3xl">
        {/* Location row */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1.5 text-primary-foreground active:scale-95 transition-transform"
          >
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-bold">ڈیلیوری کہاں کرنی ہے؟</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="text-primary-foreground/90 active:scale-95 transition-transform"
            aria-label="Favourites"
          >
            <Heart className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div
          onClick={() => document.getElementById("home-search")?.focus()}
          className="flex items-center gap-3 bg-card rounded-full px-4 py-3 shadow-soft cursor-text"
        >
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            id="home-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={rotating[idx]}
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
