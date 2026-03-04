import { Percent, Sparkles, ShoppingBag, ChefHat, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const quickCategories = [
  { name: "Offers", icon: Percent, color: "bg-primary/10 text-primary", action: "offers" },
  { name: "New", icon: Sparkles, color: "bg-warning/10 text-warning", action: "new" },
  { name: "Pick-up", icon: ShoppingBag, color: "bg-primary/10 text-primary", action: "pickup" },
  { name: "Homechefs", icon: ChefHat, color: "bg-accent text-accent-foreground", action: "homechefs" },
  { name: "Top Rated", icon: Award, color: "bg-warning/10 text-warning", action: "top-rated" },
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
    <section className="bg-gradient-to-b from-primary/5 to-transparent py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {quickCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => handleClick(cat.action)}
                className="flex flex-col items-center gap-2 shrink-0 min-w-[72px] group"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-foreground text-center leading-tight">
                  {cat.name}
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
