import { useEffect, useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { img } from "@/lib/imageUrl";
import { matchesSearch } from "@/lib/searchMatch";
import { parseCsv, productsToCsv, rowsToProducts } from "@/lib/inventoryImport";
import { Download, FileUp, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";

type Props = { storeId: string; products: any[]; categories: string[]; onChanged: () => void };
type Draft = { price: string; discount: string; available: boolean };

export default function StoreInventoryTools({ storeId, products, categories, onChanged }: Props) {
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [quick, setQuick] = useState({ name: "", price: "", discount: "", unit: "", category: categories[0] || "General" });

  const shown = useMemo(() => products.filter((p) => !q || matchesSearch(`${p.name} ${p.category || ""}`, q)).slice(0, 300), [products, q]);
  const dirty = Object.keys(drafts);

  const draftOf = (p: any): Draft => drafts[p.id] || { price: String(p.price ?? ""), discount: p.discount_price ? String(p.discount_price) : "", available: p.is_available !== false };
  const change = (p: any, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [p.id]: { ...draftOf(p), ...patch } }));

  const saveAll = async () => {
    setSaving(true);
    let failed = 0;
    for (const id of dirty) {
      const d = drafts[id];
      const price = Number(d.price);
      if (!(price > 0)) { failed++; continue; }
      const disc = d.discount ? Number(d.discount) : null;
      const discount = disc && disc > 0 && disc < price ? disc : null;
      const { error } = await supabase.from("grocery_products").update({ price, discount_price: discount, is_special_offer: !!discount, is_available: d.available }).eq("id", id);
      if (error) failed++;
    }
    setSaving(false);
    setDrafts({});
    failed ? toast.error(`${failed} چیزیں محفوظ نہیں ہوئیں — قیمت چیک کریں`) : toast.success("سب تبدیلیاں محفوظ ہو گئیں");
    onChanged();
  };

  const quickAdd = async () => {
    const price = Number(quick.price);
    if (!quick.name.trim() || !(price > 0)) { toast.error("نام اور قیمت لکھیں"); return; }
    const disc = quick.discount ? Number(quick.discount) : null;
    const discount = disc && disc > 0 && disc < price ? disc : null;
    const { error } = await supabase.from("grocery_products").insert({ store_id: storeId, name: quick.name.trim(), price, discount_price: discount, is_special_offer: !!discount, unit: quick.unit.trim() || null, category: quick.category });
    if (error) { toast.error(error.message); return; }
    toast.success("چیز شامل ہو گئی");
    setQuick((s) => ({ ...s, name: "", price: "", discount: "", unit: "" }));
    onChanged();
  };

  return (
    <div className="space-y-3 pt-3" dir="rtl">
      <Tabs defaultValue="prices">
        <TabsList className="w-full">
          <TabsTrigger value="prices" className="flex-1 text-xs">قیمتیں</TabsTrigger>
          <TabsTrigger value="catalog" className="flex-1 text-xs">فہرست سے</TabsTrigger>
          <TabsTrigger value="excel" className="flex-1 text-xs">Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-3">
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <p className="text-sm font-bold">نئی چیز جلدی شامل کریں</p>
            <Input placeholder="نام، مثلاً چینی 1 کلو" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input inputMode="numeric" placeholder="قیمت" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} />
              <Input inputMode="numeric" placeholder="رعایتی قیمت" value={quick.discount} onChange={(e) => setQuick({ ...quick, discount: e.target.value })} />
              <Input placeholder="یونٹ (kg)" value={quick.unit} onChange={(e) => setQuick({ ...quick, unit: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <select className="flex-1 h-10 rounded-md border bg-background px-2 text-sm" value={quick.category} onChange={(e) => setQuick({ ...quick, category: e.target.value })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <Button onClick={quickAdd}><Plus className="h-4 w-4" /> شامل</Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pr-9" placeholder={`${products.length} چیزوں میں تلاش کریں`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="divide-y rounded-xl border bg-card">
            {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">کوئی چیز نہیں ملی</p>}
            {shown.map((p) => {
              const d = draftOf(p);
              return (
                <div key={p.id} className={`flex items-center gap-2 p-2 ${drafts[p.id] ? "bg-primary/5" : ""}`}>
                  {p.image_url ? <img src={img(p.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{p.name}</p>
                    <div className="mt-1 flex gap-1">
                      <Input inputMode="numeric" aria-label="قیمت" className="h-8 px-2 text-xs" value={d.price} onChange={(e) => change(p, { price: e.target.value })} />
                      <Input inputMode="numeric" aria-label="رعایتی قیمت" placeholder="رعایت" className="h-8 px-2 text-xs" value={d.discount} onChange={(e) => change(p, { discount: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Switch checked={d.available} onCheckedChange={(v) => change(p, { available: v })} aria-label="موجود" />
                    <span className="text-[9px] text-muted-foreground">{d.available ? "موجود" : "ختم"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {products.length > shown.length && !q && <p className="text-center text-xs text-muted-foreground">پہلی 300 چیزیں دکھائی گئی ہیں، باقی کے لیے تلاش کریں</p>}

          {dirty.length > 0 && (
            <div className="sticky bottom-20 z-20">
              <Button className="w-full shadow-lg" disabled={saving} onClick={saveAll}><Save className="h-4 w-4" /> {saving ? "محفوظ ہو رہا ہے..." : `${dirty.length} تبدیلیاں محفوظ کریں`}</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog"><CatalogPicker storeId={storeId} existing={products} onChanged={onChanged} /></TabsContent>
        <TabsContent value="excel"><ExcelImport storeId={storeId} products={products} onChanged={onChanged} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CatalogPicker({ storeId, existing, onChanged }: { storeId: string; existing: any[]; onChanged: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (supabase as any).from("catalog_items").select("*").order("category").order("name").limit(5000).then(({ data }: any) => setItems(data || []));
  }, []);

  const have = useMemo(() => new Set(existing.map((p) => `${p.name}`.toLowerCase())), [existing]);
  const shown = useMemo(() => items.filter((i) => !have.has(i.name.toLowerCase()) && (!q || matchesSearch(`${i.name} ${i.category}`, q))).slice(0, 200), [items, q, have]);
  const picked = Object.entries(prices).filter(([, v]) => Number(v) > 0);

  const addPicked = async () => {
    setBusy(true);
    const rows = picked.map(([id, price]) => {
      const i = items.find((x) => x.id === id);
      return { store_id: storeId, name: i.name, price: Number(price), unit: i.unit, category: i.category, brand: i.brand, description: i.description, image_url: i.image_url, ...(i.weight_kg ? { weight_kg: i.weight_kg } : {}) };
    });
    const { error } = await supabase.from("grocery_products").insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} چیزیں آپ کی دکان میں شامل ہو گئیں`);
    setPrices({});
    onChanged();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">تصویر اور نام پہلے سے موجود ہیں۔ جو چیز آپ بیچتے ہیں اس کے سامنے اپنی قیمت لکھیں، پھر نیچے بٹن دبائیں۔</p>
      <div className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pr-9" placeholder={`${items.length} چیزوں کی فہرست میں تلاش`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">فہرست میں کوئی نئی چیز نہیں</p>}
        {shown.map((i) => (
          <div key={i.id} className="flex items-center gap-2 p-2">
            {i.image_url ? <img src={img(i.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{i.name}</p>
              <p className="text-[10px] text-muted-foreground">{i.category}{i.unit ? ` · ${i.unit}` : ""}</p>
            </div>
            <Input inputMode="numeric" placeholder="قیمت" className="h-8 w-20 px-2 text-xs" value={prices[i.id] || ""} onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))} />
          </div>
        ))}
      </div>
      {picked.length > 0 && (
        <div className="sticky bottom-20 z-20">
          <Button className="w-full shadow-lg" disabled={busy} onClick={addPicked}><Plus className="h-4 w-4" /> {picked.length} چیزیں دکان میں شامل کریں</Button>
        </div>
      )}
    </div>
  );
}

function ExcelImport({ storeId, products, onChanged }: { storeId: string; products: any[]; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const download = (all: boolean) => {
    const csv = all ? productsToCsv(products) : productsToCsv([{ id: "", name: "چینی / Sugar 1kg", price: 160, discount_price: 150, unit: "kg", category: "Atta & Rice", stock_qty: 50, is_available: true }]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = all ? "my-shop-items.csv" : "items-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    setBusy(true); setErrors([]);
    try {
      const rows: unknown[][] = /\.xlsx$/i.test(file.name) ? (await readXlsxFile(file)) as unknown[][] : parseCsv(await file.text());
      const { products: parsed, errors: errs } = rowsToProducts(rows, storeId);
      const ownIds = new Set(products.map((p) => p.id));
      const valid = parsed.map((p) => (ownIds.has(p.id) ? p : { ...p, id: crypto.randomUUID() }));
      let saved = 0;
      for (let i = 0; i < valid.length; i += 500) {
        const { error } = await supabase.from("grocery_products").upsert(valid.slice(i, i + 500), { onConflict: "id" });
        if (error) { errs.push(`لائن ${i + 2} سے آگے: ${error.message}`); break; }
        saved += Math.min(500, valid.length - i);
      }
      setErrors(errs);
      toast.success(`${saved} چیزیں محفوظ ہو گئیں`);
      onChanged();
    } catch (e) {
      toast.error("فائل نہیں پڑھی جا سکی: " + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 text-xs leading-6 text-muted-foreground">
        <p className="font-bold text-foreground">ہزاروں چیزیں ایک ساتھ</p>
        <p>1) نمونہ فائل ڈاؤن لوڈ کریں اور Excel میں کھولیں۔</p>
        <p>2) ہر لائن میں نام اور قیمت لکھیں (رعایت، یونٹ اور کیٹیگری اختیاری)۔</p>
        <p>3) فائل یہاں اپلوڈ کریں۔ قیمتیں بدلنی ہوں تو «میری چیزیں» ڈاؤن لوڈ کریں، بدل کر دوبارہ اپلوڈ کریں۔</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => download(false)}><Download className="h-4 w-4" /> نمونہ فائل</Button>
        <Button variant="outline" onClick={() => download(true)} disabled={!products.length}><Download className="h-4 w-4" /> میری چیزیں</Button>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" /> {busy ? "محفوظ ہو رہا ہے..." : "Excel / CSV فائل اپلوڈ کریں"}</Button>
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
          {errors.slice(0, 20).map((e) => <p key={e}>{e}</p>)}
          {errors.length > 20 && <p>اور {errors.length - 20} مزید</p>}
        </div>
      )}
    </div>
  );
}
