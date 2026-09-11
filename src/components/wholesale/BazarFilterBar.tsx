import { Grid2X2, List, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface BazarFilters {
  sort: "featured" | "price-low" | "price-high" | "rating" | "discount";
  minPrice: string;
  maxPrice: string;
  minRating: string;
  size: string;
  color: string;
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
  sizes: string[];
  colors: string[];
}

import { useLanguage } from "@/contexts/LanguageContext";

const BazarFilterBar = ({ filters, onChange, resultCount, grid, onGridChange, sizes, colors }: Props) => {
  const { t } = useLanguage();
  const activeCount = [filters.minPrice, filters.maxPrice, filters.minRating, filters.size, filters.color, filters.discountOnly, filters.nationwide, filters.wishlistOnly].filter(Boolean).length;
  const update = (patch: Partial<BazarFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ sort: "featured", minPrice: "", maxPrice: "", minRating: "", size: "", color: "", discountOnly: false, nationwide: false, wishlistOnly: false });

  return (
    <div className="sticky top-0 z-20 border-y border-border/70 bg-background/95 py-1.5 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-1.5 px-4">
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-1 px-2 text-[10px]"><SlidersHorizontal className="size-3" /> {t("bazar.filters")} {activeCount > 0 && <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">{activeCount}</span>}</Button></SheetTrigger>
          <SheetContent side="right" className="w-[min(88vw,380px)] overflow-y-auto">
            <SheetHeader><SheetTitle className="font-display">{t("bazar.filters")}</SheetTitle></SheetHeader>
            <div className="space-y-6 pt-6">
              <div><p className="mb-2 text-sm font-bold">{t("bazar.priceRange")}</p><div className="grid grid-cols-2 gap-2"><input inputMode="numeric" value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} placeholder={t("bazar.minPrice")} className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2" /><input inputMode="numeric" value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} placeholder={t("bazar.maxPrice")} className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2" /></div></div>
              <div><p className="mb-2 text-sm font-bold">{t("bazar.minRating")}</p><div className="flex gap-2">{["4", "3", "2"].map((rating) => <Button key={rating} variant={filters.minRating === rating ? "default" : "outline"} size="sm" onClick={() => update({ minRating: filters.minRating === rating ? "" : rating })}>★ {rating}+</Button>)}</div></div>
              {sizes.length > 0 && <div><p className="mb-2 text-sm font-bold">{t("bazar.size")}</p><div className="flex flex-wrap gap-2">{sizes.map((size) => <Button key={size} variant={filters.size === size ? "default" : "outline"} size="sm" onClick={() => update({ size: filters.size === size ? "" : size })}>{size}</Button>)}</div></div>}
              {colors.length > 0 && <div><p className="mb-2 text-sm font-bold">{t("bazar.color")}</p><div className="flex flex-wrap gap-2">{colors.map((color) => <Button key={color} variant={filters.color === color ? "default" : "outline"} size="sm" onClick={() => update({ color: filters.color === color ? "" : color })}>{color}</Button>)}</div></div>}
              <div className="space-y-3 text-sm"><label className="flex cursor-pointer items-center justify-between"><span>{t("bazar.discountOnly")}</span><input type="checkbox" checked={filters.discountOnly} onChange={(e) => update({ discountOnly: e.target.checked })} className="size-4 accent-primary" /></label><label className="flex cursor-pointer items-center justify-between"><span>{t("bazar.nationwideDelivery")}</span><input type="checkbox" checked={filters.nationwide} onChange={(e) => update({ nationwide: e.target.checked })} className="size-4 accent-primary" /></label><label className="flex cursor-pointer items-center justify-between"><span>{t("bazar.savedItems")}</span><input type="checkbox" checked={filters.wishlistOnly} onChange={(e) => update({ wishlistOnly: e.target.checked })} className="size-4 accent-primary" /></label></div>
              <Button variant="outline" className="w-full" onClick={clear}><X className="size-4" /> {t("bazar.clearFilters")}</Button>
            </div>
          </SheetContent>
        </Sheet>
        <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as BazarFilters["sort"] })} className="h-8 max-w-[9.5rem] rounded-md border bg-card px-1.5 text-[10px] font-semibold text-foreground outline-none"><option value="featured">{t("bazar.sortFeatured")}</option><option value="price-low">{t("bazar.sortPriceLow")}</option><option value="price-high">{t("bazar.sortPriceHigh")}</option><option value="rating">{t("bazar.sortRating")}</option><option value="discount">{t("bazar.sortDiscount")}</option></select>
        <span className="mr-auto text-[10px] text-muted-foreground">{resultCount} {t("bazar.results")}</span>
        <Button variant={grid ? "secondary" : "ghost"} size="icon" aria-label={t("bazar.gridView")} onClick={() => onGridChange(true)} className="size-8"><Grid2X2 className="size-3.5" /></Button><Button variant={!grid ? "secondary" : "ghost"} size="icon" aria-label={t("bazar.listView")} onClick={() => onGridChange(false)} className="size-8"><List className="size-3.5" /></Button>
      </div>
    </div>
  );
};

export default BazarFilterBar;
