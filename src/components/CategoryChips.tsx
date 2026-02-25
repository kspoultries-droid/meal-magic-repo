import { UtensilsCrossed, Pizza, Sandwich, Coffee, IceCreamCone, Salad, Beef, Fish } from "lucide-react";

const categories = [
  { name: "All", icon: UtensilsCrossed },
  { name: "Pizza", icon: Pizza },
  { name: "Burgers", icon: Sandwich },
  { name: "Sushi", icon: Fish },
  { name: "Coffee", icon: Coffee },
  { name: "Desserts", icon: IceCreamCone },
  { name: "Healthy", icon: Salad },
  { name: "Steak", icon: Beef },
];

const CategoryChips = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-foreground mb-5">What are you craving?</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const isActive = i === 0;
          return (
            <button
              key={cat.name}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryChips;
