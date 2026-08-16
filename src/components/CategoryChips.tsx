import { UtensilsCrossed, Pizza, Sandwich, Coffee, IceCreamCone, Salad, Beef, Flame } from "lucide-react";

const categories = [
  { name: "All", ur: "سب", icon: UtensilsCrossed },
  { name: "Biryani", ur: "بریانی", icon: Flame },
  { name: "Pizza", ur: "پیزا", icon: Pizza },
  { name: "Burgers", ur: "برگر", icon: Sandwich },
  { name: "BBQ", ur: "بی بی کیو", icon: Beef },
  { name: "Coffee", ur: "کافی", icon: Coffee },
  { name: "Desserts", ur: "میٹھا", icon: IceCreamCone },
  { name: "Healthy", ur: "ہیلتھی", icon: Salad },
];

interface CategoryChipsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryChips = ({ activeCategory, onCategoryChange }: CategoryChipsProps) => {
  return (
    <section className="container mx-auto px-4 pt-4 pb-2">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-lg font-extrabold text-foreground">آج کیا کھانا ہے؟</h2>
        <span className="text-xs text-muted-foreground">What are you craving?</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.name === activeCategory;
          return (
            <button
              key={cat.name}
              onClick={() => onCategoryChange(cat.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                  : "bg-card text-foreground border border-border/60 shadow-soft hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.ur}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryChips;
