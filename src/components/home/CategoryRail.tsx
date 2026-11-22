import { tr } from "@/lib/i18n/tr";
import { useNavigate } from "react-router-dom";
import { foodCategories } from "@/lib/foodCategories";
import { Button } from "@/components/ui/button";

const TINTS = ["bg-accent", "bg-secondary", "bg-muted"];

const CategoryRail = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-3 pb-1">
      <div className="container mx-auto flex items-baseline justify-between gap-2 px-4 pb-2">
        <h2 className="text-base font-extrabold text-foreground">{tr("What are you craving?", "آج کیا کھانا ہے؟")}</h2>
      </div>

      <div className="container mx-auto flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {foodCategories.map((cat, i) => (
          <Button variant="ghost"
            key={cat.slug}
            onClick={() => navigate(`/category/${cat.slug}`)}
            className="group flex h-auto w-[76px] shrink-0 flex-col items-center gap-1.5 whitespace-normal p-0 hover:bg-transparent"
          >
            <span className={`relative size-[72px] overflow-hidden rounded-full ${TINTS[i % TINTS.length]} p-1.5 shadow-soft ring-1 ring-border/50`}>
              <img
                src={cat.image}
                alt={tr(cat.name, cat.ur)}
                width={360}
                height={360}
                loading="lazy"
                decoding="async"
                className="h-full w-full rounded-full object-contain"
              />
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold text-foreground">{tr(cat.name, cat.ur)}</span>
          </Button>
        ))}
      </div>
    </section>
  );
};

export default CategoryRail;
