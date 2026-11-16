import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = { product: any; L: (en: string, ur: string) => string; onSaved: (p: any) => void };

const ProductQuickEdit = ({ product, L, onSaved }: Props) => {
  const specs = product.specs && typeof product.specs === "object" && !Array.isArray(product.specs) ? product.specs : {};
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: product.name || "", price: String(product.price ?? ""), discount_price: String(product.discount_price ?? ""),
    stock: String(product.stock_qty ?? ""), brand: product.brand || "", model: specs.Model || "", power: specs.Power || "", warranty: specs.Warranty || "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const price = Number(f.price);
    const disc = f.discount_price.trim() ? Number(f.discount_price) : null;
    if (!f.name.trim() || !(price > 0)) return toast.error(L("Name and valid price required", "نام اور درست قیمت ضروری ہے"));
    if (disc !== null && !(disc > 0 && disc < price)) return toast.error(L("Discount price must be less than price", "رعایتی قیمت اصل قیمت سے کم ہو"));
    const nextSpecs: Record<string, unknown> = { ...specs };
    ([["Model", f.model], ["Power", f.power], ["Warranty", f.warranty]] as const).forEach(([k, v]) => { if (v.trim()) nextSpecs[k] = v.trim(); else delete nextSpecs[k]; });
    const payload: any = { name: f.name.trim(), price, discount_price: disc, brand: f.brand.trim() || null, specs: nextSpecs };
    if (f.stock.trim() !== "") payload.stock_qty = Math.max(0, Math.floor(Number(f.stock) || 0));
    setSaving(true);
    const { data, error } = await (supabase as any).from("grocery_products").update(payload).eq("id", product.id).select("*").maybeSingle();
    setSaving(false);
    if (error || !data) return toast.error(L("Could not save", "محفوظ نہیں ہو سکا"));
    toast.success(L("Saved", "محفوظ ہو گیا"));
    onSaved(data); setOpen(false);
  };

  const row = (label: string, k: keyof typeof f, type = "text") => (
    <label className="block space-y-1"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Input type={type} value={f[k]} onChange={set(k)} /></label>
  );

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen(true)}><Pencil className="h-4 w-4" />{L("Edit", "ترمیم")}</Button>
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{L("Edit product", "چیز میں ترمیم")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {row(L("Name", "نام"), "name")}
            <div className="grid grid-cols-2 gap-2">{row(L("Price", "قیمت"), "price", "number")}{row(L("Discount price", "رعایتی قیمت"), "discount_price", "number")}</div>
            <div className="grid grid-cols-2 gap-2">{row(L("Stock", "اسٹاک"), "stock", "number")}{row(L("Brand", "برانڈ"), "brand")}</div>
            <div className="grid grid-cols-2 gap-2">{row(L("Model", "ماڈل"), "model")}{row(L("Power", "پاور"), "power")}</div>
            {row(L("Warranty", "وارنٹی"), "warranty")}
            <Button className="w-full" disabled={saving} onClick={save}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />{L("Saving...", "محفوظ ہو رہا ہے...")}</> : L("Save", "محفوظ کریں")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default ProductQuickEdit;
