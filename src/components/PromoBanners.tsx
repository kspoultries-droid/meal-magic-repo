import { ChevronRight } from "lucide-react";

const promos = [
  {
    title: "35% off",
    subtitle: "first pick-up order",
    code: "TRYPICKUP",
    gradient: "from-primary to-primary/80",
  },
  {
    title: "Up to 25% off",
    subtitle: "beverages",
    code: "",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    title: "Free delivery",
    subtitle: "on orders above Rs.499",
    code: "FREEDEL",
    gradient: "from-primary to-rose-400",
  },
];

const PromoBanners = () => {
  return (
    <section className="container mx-auto px-4 py-4">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {promos.map((promo, i) => (
          <div
            key={i}
            className={`shrink-0 w-64 rounded-2xl bg-gradient-to-br ${promo.gradient} p-5 text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity`}
          >
            <p className="text-2xl font-extrabold leading-tight">{promo.title}</p>
            <p className="text-sm font-semibold opacity-90 mb-3">{promo.subtitle}</p>
            {promo.code && (
              <span className="inline-block bg-card/20 backdrop-blur-sm rounded-lg px-3 py-1 text-xs font-bold">
                code: {promo.code}
              </span>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold opacity-80">
              T&Cs apply.
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoBanners;
