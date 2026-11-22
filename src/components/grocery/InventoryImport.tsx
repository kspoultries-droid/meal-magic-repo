import { useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, FileUp, Save, X } from "lucide-react";
import { parseCsv, prepareInventoryImport, productsToCsv, rowsToProducts } from "@/lib/inventoryImport";
import { fitsShopCapacity } from "@/lib/catalogOnboarding";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";

export default function InventoryImport({ storeId, products, onChanged }: { storeId: string; products: any[]; onChanged: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof prepareInventoryImport> | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  const download = (all: boolean) => {
    const csv = productsToCsv(all ? products : [{ name: "", price: "", unit: "", category: "General" }]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = all ? "my-shop-items.csv" : "items-template.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const open = async (file: File) => {
    setBusy(true); setErrors([]); setPreview(null);
    try {
      const rows = /\.xlsx$/i.test(file.name) ? ((await readXlsxFile(file))[0]?.data || []) as unknown[][] : parseCsv(await file.text());
      const parsed = rowsToProducts(rows, storeId);
      const h = (rows[0] || []).map((v) => String(v).trim().toLowerCase());
      setHeaders(h); setErrors(parsed.errors);
      setPreview(prepareInventoryImport(parsed.products, products, h));
    } catch { toast.error(tr("File could not be read", "فائل نہیں پڑھی جا سکی")); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  const save = async () => {
    if (lock.current || !preview?.rows.length) return;
    lock.current = true; setBusy(true);
    try {
      const { data: current, error: readError } = await supabase.from("grocery_products").select("id,name,unit").eq("store_id", storeId);
      if (readError) throw readError;
      const fresh = prepareInventoryImport(preview.rows as any, current || [], headers);
      const ownIds = new Set((current || []).map((p) => p.id));
      if (!fitsShopCapacity((current || []).length, fresh.rows.filter((p) => !ownIds.has(p.id)).length)) throw new Error(tr("Shop limit: 1000 items", "دکان کی حد: 1000 اشیا"));
      const inserts = fresh.rows.filter((p) => !ownIds.has(p.id));
      const updates = fresh.rows.filter((p) => ownIds.has(p.id));
      const succeeded = new Set<string>();
      if (inserts.length) {
        const { error } = await supabase.from("grocery_products").insert(inserts as any, { defaultToNull: false });
        if (error) throw error;
        inserts.forEach((p) => { const original = preview.rows.find((r) => r.name === p.name && r.unit === p.unit); if (original) succeeded.add(original.id); });
      }
      for (const row of updates) {
        const { id, store_id, ...payload } = row;
        const { data, error } = await supabase.from("grocery_products").update(payload as any).eq("id", id).eq("store_id", storeId).select("id").single();
        if (error || !data) {
          setPreview({ ...preview, rows: preview.rows.filter((p) => !succeeded.has(p.id)) });
          onChanged(); throw error || new Error("Save failed");
        }
        succeeded.add(id);
      }
      toast.success(tr(`${succeeded.size} items saved`, `${succeeded.size} چیزیں محفوظ ہو گئیں`));
      setPreview(null); onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Save failed. Draft retained.", "محفوظ نہیں ہوا؛ مسودہ برقرار ہے۔")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => download(false)}><Download className="h-4 w-4" />{tr("Template", "نمونہ فائل")}</Button><Button variant="outline" disabled={!products.length} onClick={() => download(true)}><Download className="h-4 w-4" />{tr("My items", "میری چیزیں")}</Button></div>
    <input ref={ref} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && open(e.target.files[0])} />
    <Button className="w-full" disabled={busy} onClick={() => ref.current?.click()}><FileUp className="h-4 w-4" />{tr("Choose Excel / CSV", "Excel / CSV منتخب کریں")}</Button>
    {errors.length > 0 && <div role="alert" className="text-xs text-destructive">{errors.slice(0, 20).map((e) => <p key={e}>{e}</p>)}</div>}
    {preview && <section className="space-y-2 border-y py-3">
      <p className="text-sm font-semibold">{tr(`Review ${preview.rows.length} items · ${preview.skipped} duplicates skipped`, `${preview.rows.length} چیزوں کا جائزہ · ${preview.skipped} دہرائی گئی چیزیں چھوڑ دی گئیں`)}</p>
      <div className="max-h-64 overflow-y-auto divide-y">{preview.rows.map((p) => <div key={p.id} className="flex justify-between gap-2 py-2 text-xs"><span>{p.name} · {p.unit}</span><span className="shrink-0">Rs {p.price}</span></div>)}</div>
      <div className="flex gap-2"><Button disabled={busy || !preview.rows.length} onClick={save}><Save className="h-4 w-4" />{tr("Confirm import", "درآمد کی تصدیق کریں")}</Button><Button variant="outline" disabled={busy} onClick={() => setPreview(null)}><X className="h-4 w-4" />{tr("Cancel", "منسوخ")}</Button></div>
    </section>}
  </div>;
}