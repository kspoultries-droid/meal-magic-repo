import { tr } from "@/lib/i18n/tr";
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
    <section className="pt-4 pb-1">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {quickCategories.map((cat, i) => {
            const Icon = cat.icon;
            const isActive = active === cat.action;
            return (
              <button
                key={cat.name}
                onClick={() => onChange(isActive ? null : cat.action)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`animate-fade-in flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all active:scale-95 ${
                  isActive ? "border-primary bg-primary text-primary-foreground shadow-glow" : "border-border bg-card text-foreground shadow-soft hover:border-primary/40"
                }`}
              >
                <Icon className={`size-4 ${isActive ? "" : "text-primary"}`} />
                {tr(cat.name, cat.ur)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickCategories;
