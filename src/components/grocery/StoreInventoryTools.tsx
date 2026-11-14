import { useEffect, useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
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
import { specsToText } from "@/lib/catalogSpecs";
const hasRealPhoto = (i: any) => !!(i.image_url && i.image_verified);

type Props = { storeId: string; products: any[]; categories: string[]; onChanged: () => void; mode?: "grocery" | "bazar" };

// Catalog categories that belong to a food/kiryana grocery shop; everything else is Bazar (electronics, shoes, clothes...).
export const GROCERY_CATALOG_CATEGORIES = new Set([
  "general", "eggs & meat", "vegetables", "snacks", "atta & rice", "fruits", "dairy", "personal care", "cleaning",
  "tea", "daal", "biscuits", "rice", "atta", "beverages", "chocolates", "sugar", "salt", "masala", "besan", "noodles", "oil",
  "bakery", "frozen", "care",
]);
export const catalogFitsMode = (category: string | null | undefined, mode: "grocery" | "bazar") =>
  GROCERY_CATALOG_CATEGORIES.has(String(category || "general").trim().toLowerCase()) === (mode === "grocery");
type Draft = { price: string; discount: string; available: boolean };

export default function StoreInventoryTools({ storeId, products, categories, onChanged, mode = "grocery", storeCategory }: Props & { storeCategory?: string | null }) {
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [quick, setQuick] = useState({ name: "", price: "", discount: "", unit: "", stock: "", description: "", category: categories[0] || "General" });

  const shown = useMemo(() => products.filter((p) => !q || matchesSearch(q, p.name, p.category)).slice(0, 300), [products, q]);
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
    const { error } = await supabase.from("grocery_products").insert({ store_id: storeId, name: quick.name.trim(), price, discount_price: discount, is_special_offer: !!discount, unit: quick.unit.trim() || null, category: quick.category, description: quick.description.trim() || null, ...(quick.stock !== "" && Number(quick.stock) >= 0 ? { stock_qty: Math.floor(Number(quick.stock)) } : {}) });
    if (error) { toast.error(error.message); return; }
    toast.success("چیز شامل ہو گئی");
    setQuick((s) => ({ ...s, name: "", price: "", discount: "", unit: "", stock: "", description: "" }));
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
              <Input placeholder="سائز/یونٹ (1kg)" value={quick.unit} onChange={(e) => setQuick({ ...quick, unit: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input inputMode="numeric" placeholder="اسٹاک تعداد" value={quick.stock} onChange={(e) => setQuick({ ...quick, stock: e.target.value })} />
              <Input className="col-span-2" placeholder="مختصر تفصیل (اختیاری)" value={quick.description} onChange={(e) => setQuick({ ...quick, description: e.target.value })} />
            </div>
            <p className="text-[10px] text-muted-foreground">تصویر اور مکمل تفصیل کے لیے اوپر «پروڈکٹ شامل» استعمال کریں۔</p>
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

        <TabsContent value="catalog"><CatalogPicker storeId={storeId} existing={products} onChanged={onChanged} mode={mode} storeCategory={storeCategory} /></TabsContent>
        <TabsContent value="excel"><ExcelImport storeId={storeId} products={products} onChanged={onChanged} /></TabsContent>
      </Tabs>
    </div>
  );
}

type Pick = { price: string; discount: string; stock: string; unit: string; usePhoto: boolean };

function CatalogPicker({ storeId, existing, onChanged, mode, storeCategory }: { storeId: string; existing: any[]; onChanged: () => void; mode: "grocery" | "bazar"; storeCategory?: string | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (supabase as any).from("catalog_items").select("*").order("category").order("name").limit(5000)
      .then(({ data }: any) => setItems((data || []).filter((i: any) => catalogFitsMode(i.category, mode))));
  }, [mode]);

  const have = useMemo(() => new Set(existing.map((p) => `${p.name}`.toLowerCase())), [existing]);
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  // Start on the shop's own category (e.g. an "Electric Store" opens on Electric/Electronics items)
  useEffect(() => {
    const raw = String(storeCategory || "").toLowerCase();
    const alias: [RegExp, string][] = [[/pharm|medic|dawa|chemist/, "medicine"], [/iron|steel|loha/, "iron & steel"], [/sanitary|hardware/, "hardware"], [/electric/, "electronics"], [/shoe|foot/, "shoes"], [/cloth|garment|fabric/, "clothes"], [/auto|bike|motor|car/, "auto parts"]];
    const sc = alias.find(([r]) => r.test(raw))?.[1] || raw;
    if (!sc || !cats.length) return;
    const match = cats.find((c) => c.toLowerCase() === sc) || cats.find((c) => sc.includes(c.toLowerCase()) || c.toLowerCase().includes(sc.split(" ")[0]));
    if (match) setCat(match);
  }, [cats, storeCategory]);
  const shown = useMemo(() => items.filter((i) => !have.has(i.name.toLowerCase()) && (cat === "all" || i.category === cat) && (!q || matchesSearch(q, i.name, i.name_ur, i.category, i.brand, i.barcode))).slice(0, 200), [items, q, have, cat]);
  const picked = Object.entries(picks).filter(([, v]) => Number(v.price) > 0);
  const pickOf = (i: any): Pick => picks[i.id] || { price: "", discount: "", stock: "", unit: i.unit || "", usePhoto: hasRealPhoto(i) };
  const setPick = (i: any, patch: Partial<Pick>) => setPicks((p) => ({ ...p, [i.id]: { ...pickOf(i), ...patch } }));

  const addPicked = async () => {
    setBusy(true);
    const rows = picked.map(([id, v]) => {
      const i = items.find((x) => x.id === id);
      const price = Number(v.price);
      const disc = Number(v.discount);
      const discount = disc > 0 && disc < price ? disc : null;
      return {
        store_id: storeId, name: i.name, price, discount_price: discount, is_special_offer: !!discount,
        unit: v.unit.trim() || i.unit, category: i.category, brand: i.brand, description: specsToText(i.category, i.specs, i.description) || null, catalog_item_id: i.id,
        image_url: v.usePhoto && hasRealPhoto(i) ? i.image_url : null,
        ...(v.usePhoto && hasRealPhoto(i) ? { images: i.images?.length ? i.images : [i.image_url] } : {}), ...(i.barcode ? { barcode: i.barcode } : {}),
        ...(v.stock !== "" && Number(v.stock) >= 0 ? { stock_qty: Math.floor(Number(v.stock)) } : {}),
        ...(i.weight_kg ? { weight_kg: i.weight_kg } : {}),
      };
    });
    const { error } = await supabase.from("grocery_products").insert(rows, { defaultToNull: false });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} چیزیں آپ کی دکان میں شامل ہو گئیں`);
    setPicks({});
    onChanged();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">صرف {mode === "bazar" ? "بازار" : "گروسری"} کی چیزیں دکھائی گئی ہیں۔ قیمت لکھیں تو رعایت، اسٹاک اور سائز کے خانے کھل جائیں گے۔ صرف تصدیق شدہ اصل تصویر ساتھ آتی ہے؛ باقی میں بعد میں اپنی دکان کی اصل تصویر لگائیں۔ نام، تفصیل اور تصویر بعد میں بدل سکتے ہیں۔</p>
      <div className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pr-9" placeholder={`${items.length} چیزوں کی فہرست میں تلاش`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {cats.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["all", ...cats].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{c === "all" ? "سب" : c}</button>
          ))}
        </div>
      )}
      <div className="divide-y rounded-xl border bg-card">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">اس قسم کی فہرست میں ابھی کوئی چیز نہیں — «قیمتیں» میں خود شامل کریں یا Excel استعمال کریں</p>}
        {shown.map((i) => {
          const v = pickOf(i);
          const active = Number(v.price) > 0;
          return (
            <div key={i.id} className={`p-2 space-y-2 ${active ? "bg-primary/5" : ""}`}>
              <div className="flex items-center gap-2">
                {hasRealPhoto(i) && v.usePhoto ? <img src={img(i.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{i.name}{i.name_ur ? ` · ${i.name_ur}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{i.category}{i.unit ? ` · ${i.unit}` : ""}</p>
                </div>
                <Input inputMode="numeric" placeholder="قیمت" className="h-8 w-20 px-2 text-xs" value={v.price} onChange={(e) => setPick(i, { price: e.target.value })} />
              </div>
              {active && (
                <div className="grid grid-cols-3 gap-1.5 items-center">
                  <Input inputMode="numeric" placeholder="رعایتی قیمت" className="h-8 px-2 text-xs" value={v.discount} onChange={(e) => setPick(i, { discount: e.target.value })} />
                  <Input inputMode="numeric" placeholder="اسٹاک" className="h-8 px-2 text-xs" value={v.stock} onChange={(e) => setPick(i, { stock: e.target.value })} />
                  <Input placeholder="سائز" className="h-8 px-2 text-xs" value={v.unit} onChange={(e) => setPick(i, { unit: e.target.value })} />
                  {hasRealPhoto(i) && (
                    <label className="col-span-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Switch checked={v.usePhoto} onCheckedChange={(c) => setPick(i, { usePhoto: c })} /> فہرست والی تصویر استعمال کریں
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
      const rows: unknown[][] = /\.xlsx$/i.test(file.name) ? (((await readXlsxFile(file))[0]?.data || []) as unknown[][]) : parseCsv(await file.text());
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
