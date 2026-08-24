import { MapPin, Search, ShieldCheck, Truck } from "lucide-react";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  storeCount?: number;
}

const BazarHero = ({ searchQuery, onSearchChange, storeCount = 0 }: Props) => {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
              EL
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-sm font-extrabold">EasyLife بازار</h1>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="size-3" /> پاکستان بھر سے ہول سیل خریداری
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{storeCount} دکانیں</span>
        </div>

        <label className="mt-2 flex h-10 items-center gap-2 rounded-lg border bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بازار میں پروڈکٹ یا دکان تلاش کریں"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="flex h-7 items-center justify-center gap-4 bg-primary px-4 text-[10px] font-semibold text-primary-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> تصدیق شدہ دکاندار</span>
        <span className="flex items-center gap-1"><Truck className="size-3" /> ملک بھر میں ڈیلیوری</span>
      </div>
    </header>
  );
};

export default BazarHero;
