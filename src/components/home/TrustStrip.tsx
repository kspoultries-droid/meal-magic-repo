import { Zap, ShieldCheck, Wallet, Headphones } from "lucide-react";

const items = [
  { icon: Zap, title: "تیز ڈیلیوری", sub: "25-40 منٹ" },
  { icon: ShieldCheck, title: "محفوظ آرڈر", sub: "تصدیق شدہ دکانیں" },
  { icon: Wallet, title: "کیش / والٹ", sub: "آسان ادائیگی" },
  { icon: Headphones, title: "24/7 سپورٹ", sub: "ہمہ وقت مدد" },
];

const TrustStrip = () => (
  <section className="container mx-auto px-4 py-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {items.map((i) => (
        <div
          key={i.title}
          className="flex items-center gap-2.5 rounded-2xl bg-card border border-border/60 shadow-soft px-3 py-2.5"
        >
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <i.icon className="w-4 h-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-foreground truncate">{i.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{i.sub}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
