import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import RestaurantGrid from "@/components/RestaurantGrid";
import { Button } from "@/components/ui/button";
import { foodCategories } from "@/lib/foodCategories";

const CategoryPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const category = foodCategories.find((c) => c.slug === slug);
  const label = category?.ur || slug;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <header className="border-b border-border bg-card px-4 py-4">
        <div className="container mx-auto max-w-5xl space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon"
              onClick={() => navigate(-1)}
              aria-label="واپس"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <ArrowRight className="h-4 w-4 text-primary" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-foreground">{label}</h1>
              <p className="text-xs text-muted-foreground">{category?.name || "Category"}</p>
            </div>
          </div>

          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-border bg-background px-3.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${label} میں تلاش کریں…`}
              aria-label="ڈش تلاش کریں"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {foodCategories.map((c) => (
              <Button variant={c.slug === slug ? "default" : "outline"}
                key={c.slug}
                onClick={() => { setQuery(""); navigate(`/category/${c.slug}`); }}
                aria-pressed={c.slug === slug}
                className="h-9 shrink-0 rounded-full px-4 text-xs font-bold"
              >
                {c.ur}
              </Button>
            ))}
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
