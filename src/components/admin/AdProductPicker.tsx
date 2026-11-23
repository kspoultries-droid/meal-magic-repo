import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Store, Utensils, Wrench, ChevronLeft, ChevronRight } from "lucide-react";
import type { AdSelection } from "@/lib/adCreative";
import { matchesSearch } from "@/lib/searchMatch";

type Business = { id: string; name: string; image_url: string | null; store_type?: string };
type Kind = "restaurant" | "store" | "service";
const PAGE = 12;

const AdProductPicker = ({ onPick }: { onPick: (p: AdSelection, product: boolean) => void }) => {
  const [kind, setKind] = useState<Kind>("restaurant");
  const [q, setQ] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let obsolete = false;
    setLoading(true); setError(""); setRows([]);
    const timer = setTimeout(async () => {
      try {
        const term = q.trim().replace(/[%_*\\]/g, "").slice(0, 100);
        let query;
        if (kind === "service") query = supabase.from("services").select("id,name,image_url,price,service_categories(name)").eq("is_active", true);
        else if (business && kind === "restaurant") query = supabase.from("menu_items").select("id,name,image_url,price").eq("restaurant_id", business.id).eq("is_available", true);
        else if (business) query = supabase.from("grocery_products").select("id,name,image_url,price,discount_price").eq("store_id", business.id).eq("is_available", true);
        else if (kind === "restaurant") query = supabase.from("restaurants").select("id,name,image_url").eq("is_active", true);
        else query = supabase.from("grocery_stores").select("id,name,image_url,store_type").eq("is_active", true);
        query = query.order("name").order("id");
        const { data, error } = await (term ? query.limit(3000) : query.range(page * PAGE, page * PAGE + PAGE));
        if (error) throw error;
        const matches = term ? (data || []).filter(row => matchesSearch(term,row.name)).slice(page * PAGE,page * PAGE + PAGE + 1) : data || [];
        if (!obsolete) { setRows(matches.slice(0, PAGE)); setMore(matches.length > PAGE); }
      } catch (e) { if (!obsolete) setError(e instanceof Error ? e.message : tr("Could not load items", "اشیا کھل نہیں سکیں")); }
      finally { if (!obsolete) setLoading(false); }
    }, 250);
    return () => { obsolete = true; clearTimeout(timer); };
  }, [q, kind, business, page]);

  const selectBusiness = (row: Business) => {
    setBusiness(row); setQ(""); setPage(0);
    onPick({ id: row.id, name: row.name, brand: row.name, image: row.image_url, price: null, originalPrice: null,
      link: kind === "restaurant" ? `/restaurant/${row.id}` : `/grocery/${row.id}`,
      placement: kind === "restaurant" ? "restaurant" : row.store_type === "wholesale" ? "bazar" : "grocery" }, false);
  };
  const selectItem = (row: any) => {
    const oldPrice = row.discount_price != null && row.discount_price > 0 && row.discount_price < row.price ? row.price : null;
    onPick({ id: row.id, name: row.name, brand: business?.name || row.service_categories?.name || row.name,
      image: row.image_url || business?.image_url || null, price: oldPrice ? row.discount_price : row.price,
      originalPrice: oldPrice, link: kind === "service" ? "/services" : kind === "restaurant" ? `/restaurant/${business?.id}` : `/product/${row.id}`,
      placement: kind === "service" ? "services" : kind === "restaurant" ? "restaurant" : business?.store_type === "wholesale" ? "bazar" : "grocery" }, true);
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Business type", "کاروبار کی قسم")}>
      {([ ["restaurant", Utensils, tr("Restaurants", "ریسٹورنٹ")], ["store", Store, tr("Shops", "دکانیں")], ["service", Wrench, tr("Services", "سروسز")] ] as const).map(([key, Icon, label]) =>
        <Button key={key} type="button" size="sm" variant={kind === key ? "default" : "outline"} aria-pressed={kind === key} onClick={() => { setKind(key); setBusiness(null); setQ(""); setPage(0); }}><Icon className="size-4 me-1" />{label}</Button>)}
    </div>
    {business && <div className="flex items-center justify-between gap-2"><p className="font-semibold break-words">{business.name}</p><Button variant="ghost" size="sm" onClick={() => { setBusiness(null); setQ(""); setPage(0); }}>{tr("Change", "تبدیل کریں")}</Button></div>}
    <Input aria-label={tr("Search business or item", "کاروبار یا چیز تلاش کریں")} placeholder={business ? tr("Search items…", "اشیا تلاش کریں…") : tr("Search by name…", "نام سے تلاش کریں…")} value={q} onChange={e => { setQ(e.target.value); setPage(0); }} />
    <div className="max-h-60 overflow-y-auto space-y-1" aria-live="polite">
      {loading ? <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" /> : error ? <p className="text-sm text-destructive">{error}</p> : !rows.length ? <p className="py-5 text-center text-sm text-muted-foreground">{tr("No results", "کوئی نتیجہ نہیں")}</p> : rows.map(row =>
        <Button key={row.id} variant="ghost" className="h-auto w-full justify-start gap-3 p-2 text-start" onClick={() => business || kind === "service" ? selectItem(row) : selectBusiness(row)}>
          {row.image_url ? <img src={row.image_url} alt="" className="size-10 shrink-0 rounded object-cover" /> : <Store className="size-10 shrink-0 p-2 text-muted-foreground" />}
          <span className="flex-1 min-w-0 whitespace-normal break-words">{row.name}</span>
          {row.price != null && <span className="text-xs shrink-0" dir="ltr">Rs {row.discount_price || row.price}</span>}
        </Button>)}
    </div>
    {(page > 0 || more) && <div className="flex justify-between"><Button size="sm" variant="outline" disabled={!page || loading} aria-label={tr("Previous results", "پچھلے نتائج")} onClick={() => setPage(p => p - 1)}><ChevronLeft className="size-4" /></Button><Button size="sm" variant="outline" disabled={!more || loading} aria-label={tr("Next results", "اگلے نتائج")} onClick={() => setPage(p => p + 1)}><ChevronRight className="size-4" /></Button></div>}
  </div>;
};
export default AdProductPicker;