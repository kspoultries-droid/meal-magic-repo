import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import RestaurantGrid from "@/components/RestaurantGrid";
import LocationBar from "@/components/location/LocationBar";
import { foodCategories } from "@/lib/foodCategories";

const CategoryPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const category = foodCategories.find((c) => c.slug === slug);
  const label = category?.ur || slug;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <Navbar />

      <header className="border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="container mx-auto max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="واپس"
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-soft active:scale-90 transition-transform"
            >
              <ArrowRight className="h-4 w-4 text-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-extrabold text-foreground">{label}</h1>
              <p className="truncate text-[11px] text-muted-foreground">{category?.name || "Category"} · بہترین ریسٹورنٹس</p>
            </div>
          </div>

          <LocationBar />

          <div className="flex h-11 items-center gap-2.5 rounded-xl border bg-card px-3.5 shadow-soft focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${label} میں تلاش کریں…`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {foodCategories.map((c) => (
              <button
                key={c.slug}
                onClick={() => navigate(`/category/${c.slug}`)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold transition-all active:scale-95 ${
                  c.slug === slug
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border border-border/60 bg-card text-foreground shadow-soft"
                }`}
              >
                {c.ur}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="pt-4">
        <RestaurantGrid searchQuery={query} activeCategory={category?.name || "All"} />
      </div>

      <BottomTabBar />
    </div>
  );
};

export default CategoryPage;
