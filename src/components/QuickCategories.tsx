import { Percent, Sparkles, ShoppingBag, ChefHat, Award } from "lucide-react";

export type QuickFilter = "offers" | "new" | "pickup" | "homechefs" | "top-rated" | null;

const quickCategories = [
  { name: "Offers", ur: "آفرز", icon: Percent, tint: "bg-gradient-primary text-primary-foreground", action: "offers" as const },
  { name: "New", ur: "نئے", icon: Sparkles, tint: "bg-warning/15 text-warning", action: "new" as const },
  { name: "Pick-up", ur: "پک اپ", icon: ShoppingBag, tint: "bg-accent text-accent-foreground", action: "pickup" as const },
  { name: "Homechefs", ur: "ہوم شیف", icon: ChefHat, tint: "bg-success/15 text-success", action: "homechefs" as const },
  { name: "Top Rated", ur: "ٹاپ ریٹڈ", icon: Award, tint: "bg-primary/10 text-primary", action: "top-rated" as const },
];

interface Props {
  active: QuickFilter;
  onChange: (f: QuickFilter) => void;
}

const QuickCategories = ({ active, onChange }: Props) => {
  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {quickCategories.map((cat, i) => {
            const Icon = cat.icon;
            const isActive = active === cat.action;
            return (
              <button
                key={cat.name}
                onClick={() => onChange(isActive ? null : cat.action)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-in flex flex-col items-center gap-1.5 shrink-0 min-w-[64px] group active:scale-95 transition-transform"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${cat.tint} flex items-center justify-center shadow-soft ring-1 transition-all ${
                    isActive ? "ring-2 ring-primary shadow-glow -translate-y-0.5" : "ring-border/50 group-hover:shadow-elegant group-hover:-translate-y-0.5"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[11px] font-bold text-center leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                  {cat.ur}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickCategories;
