import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";

export type BazarTarget = { name: string; store: string; image: string; link: string };

export default function BazarTargetPicker({ mode, onPick }: { mode: "product" | "store"; onPick: (value: BazarTarget) => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BazarTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setRows([]); setError(false); setLoading(false);
    const term = query.trim().replace(/[%,_()]/g, " ").trim();
    if (term.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (mode === "product") {
          const result = await supabase.from("grocery_products").select("id,name,image_url,grocery_stores!inner(name,is_active)").eq("is_available", true).eq("grocery_stores.is_active", true).ilike("name", `%${term}%`).limit(12);
          if (result.error) throw result.error;
          if (active) setRows((result.data || []).map(p => ({ name: p.name, store: p.grocery_stores.name, image: p.image_url || "", link: `/product/${p.id}` })));
        } else {
          const result = await supabase.from("grocery_stores").select("id,name,image_url").eq("is_active", true).ilike("name", `%${term}%`).limit(12);
          if (result.error) throw result.error;
          if (active) setRows((result.data || []).map(s => ({ name: s.name, store: s.name, image: s.image_url || "", link: `/grocery/${s.id}` })));
        }
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, mode]);
  return <div className="space-y-2">
    <Input aria-label={tr("Search selection", "انتخاب تلاش کریں")} placeholder={mode === "product" ? tr("Search product name", "آئٹم کا نام تلاش کریں") : tr("Search shop name", "دکان کا نام تلاش کریں")} value={query} onChange={e => setQuery(e.target.value)} />
    {loading && <p role="status" className="text-xs text-muted-foreground">{tr("Searching…", "تلاش جاری ہے…")}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{tr("Could not load results. Try again.", "نتائج نہیں آئے، دوبارہ کوشش کریں۔")}</p>}
    {!loading && !error && query.trim().length >= 2 && !rows.length && <p className="text-xs text-muted-foreground">{tr("No matching items or shops", "کوئی متعلقہ آئٹم یا دکان نہیں ملی")}</p>}
    <div className="max-h-48 overflow-y-auto">{rows.map(row => <Button key={row.link} type="button" variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-start" onClick={() => { onPick(row); setQuery(""); setRows([]); }}>
      {row.image && <img src={row.image} alt="" className="size-10 shrink-0 rounded object-contain" />}
      <span className="min-w-0 break-words text-xs">{row.name}{mode === "product" && <span className="block text-muted-foreground">{row.store}</span>}</span>
    </Button>)}</div>
  </div>;
}