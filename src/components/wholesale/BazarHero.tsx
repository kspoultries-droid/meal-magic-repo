import { useEffect, useState } from "react";
import { Search, ShieldCheck, Truck, Percent, Store } from "lucide-react";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  storeCount?: number;
}

const rotating = [
  "کریانہ کا تھوک ریٹ تلاش کریں…",
  "الیکٹرانکس ہول سیل تلاش کریں…",
  "کپڑے / اسٹیشنری تلاش کریں…",
  "کاسمیٹکس اور کھلونے تلاش کریں…",
];

const BazarHero = ({ searchQuery, onSearchChange, storeCount = 0 }: Props) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % rotating.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-emerald-700 text-primary-foreground">
      {/* dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="pointer-events-none absolute -top-16 -right-10 w-52 h-52 rounded-full bg-primary-foreground/10 blur-3xl" />

      <div className="relative container mx-auto px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] opacity-80">EASYLIFE</p>
            <h1 className="text-xl font-extrabold leading-tight">ہول سیل بازار</h1>
            <p className="text-[11px] opacity-85">Wholesale Bazar • تھوک ریٹ، پورے پاکستان ڈیلیوری</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none">{storeCount}</p>
            <p className="text-[10px] opacity-80">دکانیں</p>
          </div>
        </div>

        {/* search */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background/95 backdrop-blur px-3 py-2.5 shadow-lg">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={rotating[idx]}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* trust chips */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, t: "تصدیق شدہ", s: "Verified" },
            { icon: Truck, t: "پورے پاکستان", s: "Nationwide" },
            { icon: Percent, t: "تھوک ریٹ", s: "Bulk price" },
          ].map(({ icon: Icon, t, s }) => (
            <div
              key={t}
              className="flex items-center gap-1.5 rounded-xl bg-primary-foreground/15 backdrop-blur-sm px-2 py-1.5"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <div className="leading-tight min-w-0">
                <p className="text-[10px] font-bold truncate">{t}</p>
                <p className="text-[8px] opacity-75 truncate">{s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-3 bg-background rounded-t-2xl" />
      <Store className="hidden" />
    </header>
  );
};

export default BazarHero;
