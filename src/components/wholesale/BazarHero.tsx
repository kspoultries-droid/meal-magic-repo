import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  storeCount?: number;
}

const BazarHero = ({ searchQuery, onSearchChange, storeCount = 0 }: Props) => (
  <header className="border-b border-border bg-background">
    <div className="bg-gradient-hero text-primary-foreground">
      <div className="container mx-auto px-4 pb-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 font-display text-sm font-bold backdrop-blur-sm">EL</span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-lg font-bold tracking-tight">EasyLife <span className="font-sans">بازار</span></p>
              <p className="flex items-center gap-1 text-[10px] text-primary-foreground/70"><MapPin className="size-3" /> پاکستان بھر سے ہول سیل خریداری</p>
            </div>
          </div>
          <div className="text-right"><p className="font-display text-lg font-bold">{storeCount}</p><p className="text-[10px] text-primary-foreground/70">دکانیں</p></div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="max-w-xl">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" /> آج کی بہترین مارکیٹ ڈیلز</p>
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">بہتر قیمت، زیادہ بچت</h1>
            <p className="mt-1 text-xs text-primary-foreground/70">تصدیق شدہ دکانداروں سے براہِ راست خریداری</p>
          </div>
          <div className="hidden items-center gap-5 text-[10px] text-primary-foreground/70 sm:flex">
            <span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-primary" /> تصدیق شدہ</span>
            <span className="flex items-center gap-1"><Truck className="size-3.5 text-primary" /> ملک بھر میں</span>
          </div>
        </div>

        <label className="mt-4 flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-elegant focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="پروڈکٹ، برانڈ یا دکان تلاش کریں" className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
          <Button type="button" size="sm" className="hidden sm:inline-flex">تلاش کریں <ArrowRight className="size-3.5" /></Button>
        </label>
      </div>
    </div>
    <div className="flex h-9 items-center justify-center gap-5 border-b bg-card px-4 text-[10px] font-semibold text-muted-foreground sm:gap-10">
      <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> تصدیق شدہ دکاندار</span>
      <span className="flex items-center gap-1.5"><Truck className="size-3.5 text-primary" /> ملک بھر میں ڈیلیوری</span>
      <span className="hidden items-center gap-1.5 sm:flex"><Sparkles className="size-3.5 text-primary" /> روزانہ نئی ڈیلز</span>
    </div>
  </header>
);

export default BazarHero;
