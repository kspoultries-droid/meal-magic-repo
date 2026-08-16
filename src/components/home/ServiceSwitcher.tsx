import { UtensilsCrossed, Store, Package, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const services = [
  { name: "کھانا", en: "Food", icon: UtensilsCrossed, path: "/", tint: "from-primary/15 to-primary/5" },
  { name: "گروسری", en: "Grocery", icon: Store, path: "/grocery", tint: "from-warning/20 to-warning/5" },
  { name: "بازار", en: "Bazar", icon: Package, path: "/wholesale", tint: "from-accent to-accent/30" },
  { name: "سروسز", en: "Services", icon: Wrench, path: "/services", tint: "from-success/15 to-success/5" },
];

const ServiceSwitcher = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 -mt-6 relative z-10">
      <div className="grid grid-cols-4 gap-2.5">
        {services.map((s, i) => (
          <button
            key={s.en}
            onClick={() => navigate(s.path)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-scale-in group relative rounded-2xl bg-gradient-to-b ${s.tint} bg-card border border-border/60 shadow-card p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
          >
            <div className="w-10 h-10 rounded-xl bg-card shadow-soft flex items-center justify-center group-hover:scale-110 transition-transform">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[11px] font-bold text-foreground leading-none">{s.name}</span>
            <span className="text-[9px] text-muted-foreground leading-none">{s.en}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ServiceSwitcher;
