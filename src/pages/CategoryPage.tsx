import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import RestaurantGrid from "@/components/RestaurantGrid";
import { Button } from "@/components/ui/button";
import { foodCategories } from "@/lib/foodCategories";
import { useLanguage } from "@/contexts/LanguageContext";

const CategoryPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);

  const category = foodCategories.find((c) => c.slug === slug);
  const label = (lang === "ur" ? category?.ur : category?.name) || slug;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <header className="relative overflow-hidden border-b border-border bg-card">
        <div className="relative h-44 w-full overflow-hidden sm:h-56">
          {category?.image && <img src={category.image.replace("w=240&h=240", "w=1200&h=600")} alt={label} className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          <Button variant="secondary" size="icon"
            onClick={() => navigate(-1)}
            aria-label={L("Back", "واپس")}
            className="absolute top-3 h-10 w-10 rounded-full shadow-md ltr:left-3 rtl:right-3"
          >
            <ArrowRight className="h-4 w-4 text-primary ltr:rotate-180" />
          </Button>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
            <div className="container mx-auto max-w-5xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-background/80">{L("Today's craving", "آج کیا کھانا؟")}</p>
              <h1 className="text-3xl font-extrabold text-background drop-shadow">{label}</h1>
              <p className="text-sm text-background/85">{(lang === "ur" ? category?.name : category?.ur) || ""}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto -mt-5 max-w-5xl space-y-3 px-4 pb-4">
          <div className="relative flex h-12 items-center gap-2.5 rounded-full border border-border bg-background px-4 shadow-lg focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L(`Search in ${label}…`, `${label} میں تلاش کریں…`)}
              aria-label={L("Search dishes", "ڈش تلاش کریں")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-hide">
            {foodCategories.map((c) => {
              const active = c.slug === slug;
              return (
                <button
                  key={c.slug}
                  onClick={() => { setQuery(""); navigate(`/category/${c.slug}`); }}
                  aria-pressed={active}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span className={`h-14 w-14 overflow-hidden rounded-full border-2 transition ${active ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border"}`}>
                    <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </span>
                  <span className={`truncate text-[11px] font-bold ${active ? "text-primary" : "text-foreground"}`}>{lang === "ur" ? c.ur : c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="pt-4">
        <RestaurantGrid searchQuery={query} activeCategory={category?.name || "All"} dishesOnly />
      </div>

      <BottomTabBar />
    </div>
  );
};

export default CategoryPage;
