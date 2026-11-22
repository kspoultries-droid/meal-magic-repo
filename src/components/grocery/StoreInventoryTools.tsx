import { useEffect, useMemo, useRef, useState } from "react";
import InventoryImport from "./InventoryImport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { img } from "@/lib/imageUrl";
import { matchesSearch } from "@/lib/searchMatch";

import { Download, FileUp, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { specsToText } from "@/lib/catalogSpecs";
import { tr } from "@/lib/i18n/tr";
import { Checkbox } from "@/components/ui/checkbox";
import { catalogImages, catalogFitsMode, sameCatalogProduct, starterPack, uniqueCatalogItems, validItemNumbers } from "@/lib/catalogOnboarding";
export { catalogFitsMode, GROCERY_CATALOG_CATEGORIES } from "@/lib/catalogOnboarding";
const hasRealPhoto = (i: any) => catalogImages(i).length > 0;

type Props = { storeId: string; products: any[]; categories: string[]; onChanged: () => void; mode?: "grocery" | "bazar" };

type Draft = { price: string; discount: string; available: boolean };

export default function StoreInventoryTools({ storeId, products, categories, onChanged, mode = "grocery", storeCategory }: Props & { storeCategory?: string | null }) {
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const quickLock = useRef(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [quick, setQuick] = useState({ name: "", price: "", discount: "", unit: "", stock: "", description: "", category: categories[0] || "General" });

  const shown = useMemo(() => products.filter((p) => !q || matchesSearch(q, p.name, p.category)).slice(0, 300), [products, q]);
  const dirty = Object.keys(drafts);

  const draftOf = (p: any): Draft => drafts[p.id] || { price: String(p.price ?? ""), discount: p.discount_price ? String(p.discount_price) : "", available: p.is_available !== false };
  const change = (p: any, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [p.id]: { ...draftOf(p), ...patch } }));

  const saveAll = async () => {
    if (saveLock.current) return;
    saveLock.current = true; setSaving(true);
    const succeeded: string[] = [];
    try {
      for (const id of dirty) {
        const d = drafts[id];
        if (!validItemNumbers(d.price, d.discount, "")) continue;
        const { error, data } = await supabase.from("grocery_products").update({ price: Number(d.price), discount_price: d.discount ? Number(d.discount) : null, is_special_offer: !!d.discount, is_available: d.available }).eq("id", id).eq("store_id", storeId).select("id").single();
        if (!error && data) succeeded.push(id);
      }
      setDrafts((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => !succeeded.includes(id))));
      succeeded.length < dirty.length ? toast.error(tr("Some changes were not saved. Your draft is retained.", "کچھ تبدیلیاں محفوظ نہیں ہوئیں؛ آپ کے لکھے ہوئے خانے برقرار ہیں۔")) : toast.success(tr("Changes saved", "تبدیلیاں محفوظ ہو گئیں"));
      onChanged();
    } finally { saveLock.current = false; setSaving(false); }
  };

  const quickAdd = async () => {
    if (quickLock.current) return;
    if (!quick.name.trim() || !validItemNumbers(quick.price, quick.discount, quick.stock)) { toast.error(tr("Check name, price, discount and stock", "نام، قیمت، رعایت اور اسٹاک درست کریں")); return; }
    quickLock.current = true; setQuickBusy(true);
    try {
      const { data: current, error: readError } = await supabase.from("grocery_products").select("id,name,unit,barcode,catalog_item_id").eq("store_id", storeId);
      if (readError) throw readError;
      if ((current || []).some((p) => sameCatalogProduct(p, quick))) { toast.error(tr("This item already exists in this shop", "یہ چیز اس دکان میں پہلے سے موجود ہے")); return; }
      const { error } = await supabase.from("grocery_products").insert({ store_id: storeId, name: quick.name.trim(), price: Number(quick.price), discount_price: quick.discount ? Number(quick.discount) : null, is_special_offer: !!quick.discount, unit: quick.unit.trim() || null, category: quick.category, description: quick.description.trim() || null, stock_qty: quick.stock === "" ? null : Number(quick.stock), is_available: quick.stock !== "" && Number(quick.stock) > 0 });
      if (error) throw error;
      toast.success(tr("Item added", "چیز شامل ہو گئی"));
      setQuick((s) => ({ ...s, name: "", price: "", discount: "", unit: "", stock: "", description: "" }));
      onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Item could not be saved", "چیز محفوظ نہیں ہوئی")); }
    finally { quickLock.current = false; setQuickBusy(false); }
  };

  return (
    <div className="space-y-3 pt-3" dir="rtl">
      <Tabs defaultValue="prices">
        <TabsList className="w-full">
          <TabsTrigger value="prices" className="flex-1 text-xs">{tr("Prices", "قیمتیں")}</TabsTrigger>
          <TabsTrigger value="catalog" className="flex-1 text-xs">{tr("Catalog", "فہرست سے")}</TabsTrigger>
          <TabsTrigger value="excel" className="flex-1 text-xs">Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-3">
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <p className="text-sm font-bold">{tr("Quick add item", "نئی چیز جلدی شامل کریں")}</p>
            <Input placeholder={tr("Name, e.g. Sugar 1kg", "نام، مثلاً چینی 1 کلو")} value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input inputMode="numeric" placeholder={tr("Price", "قیمت")} value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} />
              <Input inputMode="numeric" placeholder={tr("Sale price", "رعایتی قیمت")} value={quick.discount} onChange={(e) => setQuick({ ...quick, discount: e.target.value })} />
              <Input placeholder={tr("Size/unit (1kg)", "سائز/یونٹ (1kg)")} value={quick.unit} onChange={(e) => setQuick({ ...quick, unit: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input inputMode="numeric" placeholder={tr("Stock quantity", "اسٹاک تعداد")} value={quick.stock} onChange={(e) => setQuick({ ...quick, stock: e.target.value })} />
              <Input className="col-span-2" placeholder={tr("Description (optional)", "مختصر تفصیل (اختیاری)")} value={quick.description} onChange={(e) => setQuick({ ...quick, description: e.target.value })} />
            </div>
            <p className="text-[10px] text-muted-foreground">تصویر اور مکمل تفصیل کے لیے اوپر «پروڈکٹ شامل» استعمال کریں۔</p>
            <div className="flex gap-2">
              <select className="flex-1 h-10 rounded-md border bg-background px-2 text-sm" value={quick.category} onChange={(e) => setQuick({ ...quick, category: e.target.value })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <Button disabled={quickBusy} onClick={quickAdd}><Plus className="h-4 w-4" /> شامل</Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pr-9" placeholder={`${products.length} چیزوں میں تلاش کریں`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="divide-y rounded-xl border bg-card">
            {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{tr("No items found", "کوئی چیز نہیں ملی")}</p>}
            {shown.map((p) => {
              const d = draftOf(p);
              return (
                <div key={p.id} className={`flex items-center gap-2 p-2 ${drafts[p.id] ? "bg-primary/5" : ""}`}>
                  {p.image_url ? <img src={img(p.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{p.name}</p>
                    <div className="mt-1 flex gap-1">
                      <Input inputMode="numeric" aria-label={tr("Price", "قیمت")} className="h-8 px-2 text-xs" value={d.price} onChange={(e) => change(p, { price: e.target.value })} />
                      <Input inputMode="numeric" aria-label={tr("Sale price", "رعایتی قیمت")} placeholder={tr("Sale price", "رعایت")} className="h-8 px-2 text-xs" value={d.discount} onChange={(e) => change(p, { discount: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Switch checked={d.available} onCheckedChange={(v) => change(p, { available: v })} aria-label={tr("Available", "موجود")} />
                    <span className="text-[9px] text-muted-foreground">{d.available ? tr("Available", "موجود") : tr("Out of stock", "ختم")}</span>
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
        <TabsContent value="excel"><InventoryImport storeId={storeId} products={products} onChanged={onChanged} /></TabsContent>
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
  const addLock = useRef(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    (supabase as any).from("catalog_items").select("*").order("category").order("name").limit(5000)
      .then(({ data, error }: any) => { if (!active) return; if (error) setLoadError(error.message); else setItems((data || []).filter((i: any) => catalogFitsMode(i.category, mode))); setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  const available = useMemo(() => uniqueCatalogItems(items, existing), [items, existing]);
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
  const shown = useMemo(() => available.filter((i) => (picks[i.id] || cat === "all" || i.category === cat) && (!q || matchesSearch(q, i.name, i.name_ur, i.category, i.brand, i.barcode))).slice(0, 200), [available, q, picks, cat]);
  const picked = Object.entries(picks);
  const incomplete = picked.filter(([, v]) => !validItemNumbers(v.price, v.discount, v.stock));
  const pickOf = (i: any): Pick => picks[i.id] || { price: "", discount: "", stock: "", unit: i.unit || "", usePhoto: hasRealPhoto(i) };
  const setPick = (i: any, patch: Partial<Pick>) => setPicks((p) => ({ ...p, [i.id]: { ...pickOf(i), ...patch } }));

  const addPicked = async () => {
    if (addLock.current || !picked.length || incomplete.length) return;
    addLock.current = true; setBusy(true);
    try {
      const { data: current, error: readError } = await supabase.from("grocery_products").select("id,name,unit,barcode,catalog_item_id").eq("store_id", storeId);
      if (readError) throw readError;
      const fresh = uniqueCatalogItems(items.filter((i) => picks[i.id]), current || []);
      if ((current || []).length + fresh.length > 1000) throw new Error(tr("A shop can hold at most 1000 items", "دکان میں زیادہ سے زیادہ 1000 اشیا ہو سکتی ہیں"));
      const rows = fresh.map((i) => {
        const v = picks[i.id];
        const images = v.usePhoto ? catalogImages(i) : [];
        return { store_id: storeId, name: i.name, price: Number(v.price), discount_price: v.discount ? Number(v.discount) : null, is_special_offer: !!v.discount,
          unit: v.unit.trim() || i.unit, category: i.category, brand: i.brand, description: specsToText(i.category, i.specs, i.description) || null, catalog_item_id: i.id,
          image_url: images[0] || null, images, ...(i.barcode ? { barcode: i.barcode } : {}),
          stock_qty: v.stock === "" ? null : Number(v.stock), is_available: v.stock !== "" && Number(v.stock) > 0,
          ...(i.weight_kg ? { weight_kg: i.weight_kg } : {}) };
      });
      if (rows.length) {
        const { error } = await supabase.from("grocery_products").insert(rows, { defaultToNull: false });
        if (error) throw error;
      }
      toast.success(tr(`${rows.length} items added`, `${rows.length} چیزیں شامل ہو گئیں`));
      setPicks({}); onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Could not save. Draft retained.", "محفوظ نہیں ہوا؛ آپ کا مسودہ برقرار ہے۔")); }
    finally { addLock.current = false; setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tr("Choose items, then enter your prices and stock. Only verified catalog photos are copied.", "چیزیں منتخب کریں، پھر اپنی قیمتیں اور اسٹاک لکھیں۔ صرف تصدیق شدہ تصاویر ساتھ آئیں گی۔")}</p>
      <div className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pr-9" aria-label={tr("Search catalog", "فہرست میں تلاش")} placeholder={tr(`Search ${items.length} items`, `${items.length} چیزوں کی فہرست میں تلاش`)} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {cats.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["all", ...cats].map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} disabled={busy} onClick={() => setCat(c)} className="shrink-0 text-xs">{c === "all" ? tr("All", "سب") : c}</Button>
          ))}
        </div>
      )}
      {mode === "grocery" && <div className="space-y-2 border-y py-3">
        <Button variant="outline" className="w-full h-auto whitespace-normal" disabled={busy || loading || !!loadError} onClick={() => { const pack = starterPack(items, existing, storeCategory); setCat("all"); setQ(""); setPicks((previous) => { const next = { ...previous }; pack.forEach((i) => { if (!next[i.id]) next[i.id] = pickOf(i); }); return next; }); }}>
          <Plus className="h-4 w-4 shrink-0" /> {tr("Prepare grocery starter pack", "کریانہ اسٹارٹر پیک تیار کریں")}
        </Button>
        <p className="text-xs text-muted-foreground">{tr("Up to 100 matching items. Enter your prices and stock before saving. No stock entered means unavailable.", "100 تک متعلقہ چیزیں؛ محفوظ کرنے سے پہلے اپنی قیمت اور اسٹاک لکھیں۔ خالی اسٹاک والی چیز فروخت کے لیے بند رہے گی۔")}</p>
      </div>}
      {loading && <p role="status">{tr("Loading catalog…", "فہرست آ رہی ہے…")}</p>}
      {picked.length > 0 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPicks({})}>{tr("Clear selection", "انتخاب صاف کریں")}</Button>}
      {loadError && <p role="alert" className="text-destructive">{loadError}</p>}
      <div className="divide-y rounded-xl border bg-card">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">اس قسم کی فہرست میں ابھی کوئی چیز نہیں — «قیمتیں» میں خود شامل کریں یا Excel استعمال کریں</p>}
        {shown.map((i) => {
          const v = pickOf(i);
          const active = !!picks[i.id];
          return (
            <div key={i.id} className={`p-2 space-y-2 ${active ? "bg-primary/5" : ""}`}>
              <div className="flex items-center gap-2">
                <Checkbox disabled={busy} checked={active} aria-label={tr(`Select ${i.name}`, `${i.name} منتخب کریں`)} onCheckedChange={(checked) => setPicks((previous) => { const next = { ...previous }; if (checked) next[i.id] = pickOf(i); else delete next[i.id]; return next; })} />
                {hasRealPhoto(i) && v.usePhoto ? <img src={img(catalogImages(i)[0], 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{i.name}{i.name_ur ? ` · ${i.name_ur}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{i.category}{i.unit ? ` · ${i.unit}` : ""}</p>
                </div>
                <Input inputMode="numeric" placeholder={tr("Price", "قیمت")} className="h-8 w-20 px-2 text-xs" disabled={busy} aria-label={tr(`Price for ${i.name}`, `${i.name} کی قیمت`)} value={v.price} onChange={(e) => setPick(i, { price: e.target.value })} />
              </div>
              {active && (
                <div className="grid grid-cols-3 gap-1.5 items-center">
                  <Input disabled={busy} inputMode="numeric" placeholder={tr("Sale price", "رعایتی قیمت")} className="h-8 px-2 text-xs" value={v.discount} onChange={(e) => setPick(i, { discount: e.target.value })} />
                  <Input disabled={busy} inputMode="numeric" placeholder={tr("Stock", "اسٹاک")} aria-label={tr(`Stock for ${i.name}`, `${i.name} کا اسٹاک`)} className="h-8 px-2 text-xs" value={v.stock} onChange={(e) => setPick(i, { stock: e.target.value })} />
                  <Input disabled={busy} placeholder={tr("Size", "سائز")} className="h-8 px-2 text-xs" value={v.unit} onChange={(e) => setPick(i, { unit: e.target.value })} />
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
          <p className="bg-background py-1 text-xs" role="status">{incomplete.length ? tr(`${incomplete.length} items need valid prices`, `${incomplete.length} چیزوں کی قیمت درست کرنا باقی ہے`) : tr("Ready to save", "محفوظ کرنے کے لیے تیار")}</p><Button className="w-full shadow-lg" disabled={busy || incomplete.length > 0} onClick={addPicked}><Plus className="h-4 w-4" /> {tr(`Add ${picked.length} items to shop`, `${picked.length} چیزیں دکان میں شامل کریں`)}</Button>
        </div>
      )}
    </div>
  );
}
