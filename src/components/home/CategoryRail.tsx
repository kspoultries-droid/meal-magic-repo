import { useNavigate } from "react-router-dom";
import { foodCategories } from "@/lib/foodCategories";
import { Button } from "@/components/ui/button";

const CategoryRail = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-3 pb-1">
      <div className="container mx-auto flex items-baseline justify-between gap-2 px-4 pb-2">
        <h2 className="text-base font-extrabold text-foreground">آج کیا کھانا ہے؟</h2>
        <span className="text-[11px] text-muted-foreground">What are you craving?</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {foodCategories.map((cat, i) => (
          <Button variant="ghost"
            key={cat.slug}
            onClick={() => navigate(`/category/${cat.slug}`)}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-in group flex h-auto w-[78px] shrink-0 flex-col items-center gap-1.5 whitespace-normal p-0 hover:bg-transparent active:scale-95 transition-transform"
          >
            <span className="relative h-[78px] w-[78px] overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold text-foreground">{cat.ur}</span>
          </Button>
        ))}
      </div>
    </section>
  );
};

export default CategoryRail;
