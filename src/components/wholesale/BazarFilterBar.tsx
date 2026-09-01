import { Filter, Grid2X2, List, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface BazarFilters {
  sort: "featured" | "price-low" | "price-high" | "rating" | "discount";
  minPrice: string;
  maxPrice: string;
  minRating: string;
  discountOnly: boolean;
  nationwide: boolean;
  wishlistOnly: boolean;
}

interface Props {
  filters: BazarFilters;
  onChange: (filters: BazarFilters) => void;
  resultCount: number;
  grid: boolean;
  onGridChange: (grid: boolean) => void;
}

const BazarFilterBar = ({ filters, onChange, resultCount, grid, onGridChange }: Props) => {
  const activeCount = [filters.minPrice, filters.maxPrice, filters.minRating, filters.discountOnly, filters.nationwide, filters.wishlistOnly].filter(Boolean).length;
  const update = (patch: Partial<BazarFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ sort: "featured", minPrice: "", maxPrice: "", minRating: "", discountOnly: false, nationwide: false, wishlistOnly: false });

  return (
    <div className="sticky top-0 z-20 border-y bg-background/95 py-2 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-2 px-4">
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" size="sm" className="gap-1.5"><SlidersHorizontal className="size-3.5" /> فلٹرز {activeCount > 0 && <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">{activeCount}</span>}</Button></SheetTrigger>
          <SheetContent side="right" className="w-[min(88vw,380px)] overflow-y-auto">
            <SheetHeader><SheetTitle className="font-display">فلٹرز</SheetTitle></SheetHeader>
            <div className="space-y-6 pt-6">
              <div><p className="mb-2 text-sm font-bold">قیمت کی حد</p><div className="grid grid-cols-2 gap-2"><input inputMode="numeric" value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} placeholder="کم از کم" className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2" /><input inputMode="numeric" value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} placeholder="زیادہ سے زیادہ" className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2" /></div></div>
              <div><p className="mb-2 text-sm font-bold">کم از کم ریٹنگ</p><div className="flex gap-2">{["4", "3", "2"].map((rating) => <Button key={rating} variant={filters.minRating === rating ? "default" : "outline"} size="sm" onClick={() => update({ minRating: filters.minRating === rating ? "" : rating })}>★ {rating}+</Button>)}</div></div>
              <div className="space-y-3 text-sm"><label className="flex cursor-pointer items-center justify-between"><span>صرف ڈسکاؤنٹ والی اشیا</span><input type="checkbox" checked={filters.discountOnly} onChange={(e) => update({ discountOnly: e.target.checked })} className="size-4 accent-primary" /></label><label className="flex cursor-pointer items-center justify-between"><span>ملک بھر میں ڈیلیوری</span><input type="checkbox" checked={filters.nationwide} onChange={(e) => update({ nationwide: e.target.checked })} className="size-4 accent-primary" /></label><label className="flex cursor-pointer items-center justify-between"><span>محفوظ اشیا</span><input type="checkbox" checked={filters.wishlistOnly} onChange={(e) => update({ wishlistOnly: e.target.checked })} className="size-4 accent-primary" /></label></div>
              <Button variant="outline" className="w-full" onClick={clear}><X className="size-4" /> فلٹرز صاف کریں</Button>
            </div>
          </SheetContent>
        </Sheet>
        <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as BazarFilters["sort"] })} className="h-9 rounded-md border bg-card px-2 text-xs font-semibold text-foreground outline-none"><option value="featured">نمایاں</option><option value="price-low">قیمت: کم سے زیادہ</option><option value="price-high">قیمت: زیادہ سے کم</option><option value="rating">بہترین ریٹنگ</option><option value="discount">زیادہ ڈسکاؤنٹ</option></select>
        <span className="mr-auto text-[10px] text-muted-foreground">{resultCount} نتائج</span>
        <Button variant={grid ? "secondary" : "ghost"} size="icon" aria-label="گرڈ ویو" onClick={() => onGridChange(true)} className="size-8"><Grid2X2 className="size-4" /></Button><Button variant={!grid ? "secondary" : "ghost"} size="icon" aria-label="لسٹ ویو" onClick={() => onGridChange(false)} className="size-8"><List className="size-4" /></Button>
      </div>
    </div>
  );
};

export default BazarFilterBar;
