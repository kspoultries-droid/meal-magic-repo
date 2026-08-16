import { Percent, Sparkles, ShoppingBag, ChefHat, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const quickCategories = [
  { name: "Offers", ur: "آفرز", icon: Percent, tint: "bg-gradient-primary text-primary-foreground", action: "offers" },
  { name: "New", ur: "نئے", icon: Sparkles, tint: "bg-warning/15 text-warning", action: "new" },
  { name: "Pick-up", ur: "پک اپ", icon: ShoppingBag, tint: "bg-accent text-accent-foreground", action: "pickup" },
  { name: "Homechefs", ur: "ہوم شیف", icon: ChefHat, tint: "bg-success/15 text-success", action: "homechefs" },
  { name: "Top Rated", ur: "ٹاپ ریٹڈ", icon: Award, tint: "bg-primary/10 text-primary", action: "top-rated" },
];

const QuickCategories = () => {
  const navigate = useNavigate();

  const handleClick = (action: string) => {
    switch (action) {
      case "offers":
        toast.info("آفرز جلد آ رہی ہیں!");
        break;
      case "new":
        toast.info("نئے ریسٹورنٹس جلد شامل ہوں گے!");
        break;
      case "pickup":
        toast.info("پِک اپ سروس جلد دستیاب ہوگی!");
        break;
      case "homechefs":
        toast.info("ہوم شیفز فیچر جلد آ رہا ہے!");
        break;
      case "top-rated":
        navigate("/search");
        break;
    }
  };

  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {quickCategories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => handleClick(cat.action)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-in flex flex-col items-center gap-1.5 shrink-0 min-w-[64px] group active:scale-95 transition-transform"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${cat.tint} flex items-center justify-center shadow-soft ring-1 ring-border/50 group-hover:shadow-elegant group-hover:-translate-y-0.5 transition-all`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-foreground text-center leading-tight">{cat.ur}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickCategories;
