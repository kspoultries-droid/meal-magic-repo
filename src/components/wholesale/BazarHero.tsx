import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromotionalAds from "@/components/PromotionalAds";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
}

const BazarHero = ({ searchQuery, onSearchChange }: Props) => (
  <header className="border-b border-border bg-background">
    <div className="bg-gradient-primary text-primary-foreground">
      <div className="container mx-auto px-4 pb-5 pt-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-foreground/80">
          <MapPin className="size-3.5" /> پاکستان بھر سے ہول سیل خریداری
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary-foreground/80"><Sparkles className="size-3.5" /> آج کی بہترین مارکیٹ ڈیلز</p>
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-4xl">بہتر قیمت، زیادہ بچت</h1>
            <p className="mt-1 text-xs text-primary-foreground/80 sm:text-sm">تصدیق شدہ دکانداروں سے براہِ راست خریداری</p>
          </div>
          <div className="hidden items-center gap-5 text-[10px] font-semibold text-primary-foreground/80 sm:flex">
            <span className="flex items-center gap-1"><ShieldCheck className="size-3.5" /> تصدیق شدہ</span>
            <span className="flex items-center gap-1"><Truck className="size-3.5" /> ملک بھر میں</span>
          </div>
        </div>
        <label className="mt-4 flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-elegant focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="پروڈکٹ، برانڈ یا دکان تلاش کریں" className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
          <Button type="button" size="sm" className="hidden sm:inline-flex">تلاش کریں <ArrowRight className="size-3.5" /></Button>
        </label>
      </div>
    </div>
    <PromotionalAds placement="bazar" className="container mx-auto px-4 py-3" />
    <div className="flex h-9 items-center justify-center gap-5 border-t border-border bg-card px-4 text-[10px] font-semibold text-muted-foreground sm:gap-10">
      <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> تصدیق شدہ دکاندار</span>
      <span className="flex items-center gap-1.5"><Truck className="size-3.5 text-primary" /> ملک بھر میں ڈیلیوری</span>
      <span className="hidden items-center gap-1.5 sm:flex"><Sparkles className="size-3.5 text-primary" /> روزانہ نئی ڈیلز</span>
    </div>
  </header>
);

export default BazarHero;
