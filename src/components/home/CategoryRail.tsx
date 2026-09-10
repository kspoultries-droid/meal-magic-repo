import { useNavigate } from "react-router-dom";
import { foodCategories } from "@/lib/foodCategories";

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
          <button
            key={cat.slug}
            onClick={() => navigate(`/category/${cat.slug}`)}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-in group flex w-[78px] shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="relative h-[78px] w-[78px] overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-soft">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold text-foreground">{cat.ur}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryRail;
