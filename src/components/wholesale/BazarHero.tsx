import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromotionalAds from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
}

const BazarHero = ({ searchQuery, onSearchChange }: Props) => (
  <header className="border-b border-border bg-gradient-hero text-foreground">
    <div className="container mx-auto px-4 pb-4 pt-4 sm:pb-5 sm:pt-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
        <MapPin className="size-3.5 text-primary" /> پاکستان بھر سے ہول سیل خریداری
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary"><Sparkles className="size-3.5" /> آج کی بہترین مارکیٹ ڈیلز</p>
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-4xl">بہتر قیمت، زیادہ بچت</h1>
          <p className="mt-1 text-xs text-foreground/65 sm:text-sm">تصدیق شدہ دکانداروں سے براہِ راست خریداری</p>
        </div>
        <div className="hidden items-center gap-5 text-[10px] font-semibold text-foreground/70 sm:flex">
          <span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-primary" /> تصدیق شدہ</span>
          <span className="flex items-center gap-1"><Truck className="size-3.5 text-primary" /> ملک بھر میں</span>
        </div>
      </div>
      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 shadow-elegant focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="پروڈکٹ، برانڈ یا دکان تلاش کریں" className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
        <Button type="button" size="sm" className="hidden sm:inline-flex">تلاش کریں <ArrowRight className="size-3.5" /></Button>
      </label>
    </div>
    <PromotionalAds placement="bazar" className="container mx-auto px-4 pb-3" />
    <div className="flex min-h-9 items-center justify-center gap-4 border-t border-border/70 bg-card/75 px-4 py-2 text-[10px] font-semibold text-muted-foreground sm:gap-10">
      <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> تصدیق شدہ دکاندار</span>
      <span className="flex items-center gap-1.5"><Truck className="size-3.5 text-primary" /> ملک بھر میں ڈیلیوری</span>
      <span className="hidden items-center gap-1.5 sm:flex"><Sparkles className="size-3.5 text-primary" /> روزانہ نئی ڈیلز</span>
    </div>
  </header>
);

export default BazarHero;
