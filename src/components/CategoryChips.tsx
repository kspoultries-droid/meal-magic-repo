import { useNavigate } from "react-router-dom";
import { foodCategories } from "@/lib/foodCategories";

interface CategoryChipsProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const CategoryChips = (_props: CategoryChipsProps) => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 pt-4 pb-2">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-lg font-extrabold text-foreground">آج کیا کھانا ہے؟</h2>
        <span className="text-xs text-muted-foreground">What are you craving?</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
        {foodCategories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.slug}
              onClick={() => navigate(`/category/${cat.slug}`)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-fade-in group flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant active:scale-95"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-bold leading-tight text-foreground">{cat.ur}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryChips;
