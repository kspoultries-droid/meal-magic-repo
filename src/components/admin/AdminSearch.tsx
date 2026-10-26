import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, ArrowUpLeft } from "lucide-react";

type Hit = { id: string; kind: string; label: string; sub: string; section: string; tab?: string; query: string };
export default function AdminSearch({ onNavigate }: { onNavigate: (section: string, tab?: string, query?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const search = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    const current = ++request.current;
    setBusy(true); setError(""); setSearched(false);
    // Escape pattern metacharacters; no user input enters PostgREST filter syntax.
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    const orderQuery = (table: "orders" | "grocery_cart_orders" | "grocery_list_orders") => {
      const base = supabase.from(table).select("id,status");
      return uuid ? base.eq("id", q).limit(1) : base.order("created_at", { ascending: false }).limit(100);
    };
    try {
      const [rests, stores, names, phones, food, cart, list] = await Promise.all([
        supabase.from("restaurants").select("id,name").ilike("name", like).limit(8),
        supabase.from("grocery_stores").select("id,name").ilike("name", like).limit(8),
        supabase.from("profiles").select("id,full_name,phone").ilike("full_name", like).limit(8),
        uuid ? supabase.from("profiles").select("id,full_name,phone").eq("id", q) : supabase.from("profiles").select("id,full_name,phone").ilike("phone", like).limit(8),
        orderQuery("orders"), orderQuery("grocery_cart_orders"), orderQuery("grocery_list_orders"),
      ]);
      if (current !== request.current) return;
      const people = [...new Map([...(names.data || []), ...(phones.data || [])].map(p => [p.id, p])).values()];
      const out: Hit[] = [
        ...(rests.data || []).map(r => ({ id: r.id, kind: "ریسٹورنٹ", label: r.name, sub: "", section: "partners", tab: "restaurants", query: r.id })),
        ...(stores.data || []).map(r => ({ id: r.id, kind: "گروسری", label: r.name, sub: "", section: "partners", tab: "grocery", query: r.name })),
        ...people.map(p => ({ id: p.id, kind: "صارف", label: p.full_name || p.id.slice(0, 8), sub: p.phone || "", section: "people", query: p.id })),
        ...[[food, "فوڈ", "orders"], [cart, "گروسری", "grocery-dispatch"], [list, "فوٹو لسٹ", "photo-orders"]].flatMap(([result, kind, tab]) => ((result as typeof food).data || []).filter(o => o.id.toLowerCase().startsWith(q.toLowerCase())).map(o => ({ id: o.id, kind: String(kind), label: `#${o.id.slice(0, 8)}`, sub: o.status, section: "operations", tab: String(tab), query: o.id }))),
      ];
      setHits(out); setSearched(true);
      if ([rests, stores, names, phones, food, cart, list].some(r => r.error)) setError("کچھ نتائج دستیاب نہیں؛ دوبارہ تلاش کریں۔");
    } catch { if (current === request.current) setError("تلاش مکمل نہیں ہوئی؛ دوبارہ کوشش کریں۔"); }
    finally { if (current === request.current) setBusy(false); }
  };
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="ایڈمن کی مشترکہ تلاش"><Search className="size-4" /><span className="hidden sm:inline">تلاش</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl" dir="rtl"><DialogHeader><DialogTitle>مشترکہ تلاش</DialogTitle><DialogDescription>دکان، صارف، فون یا آرڈر آئی ڈی؛ مختصر آرڈر آئی ڈی کے لیے ہر شعبے کے تازہ 100 آرڈرز۔</DialogDescription></DialogHeader><form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search(); }}><Input autoFocus aria-label="مشترکہ تلاش" value={query} onChange={e => { request.current++; setBusy(false); setQuery(e.target.value); setSearched(false); setHits([]); }} /><Button type="submit" size="icon" disabled={busy || query.trim().length < 2} aria-label="تلاش کریں"><Search className="size-4" /></Button></form><div className="max-h-96 space-y-1 overflow-y-auto">{busy && <p className="text-xs text-muted-foreground">تلاش جاری ہے…</p>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}{searched && hits.length === 0 && <p className="text-xs text-muted-foreground">کوئی نتیجہ نہیں ملا</p>}{hits.map(h => <Button key={`${h.kind}-${h.id}`} variant="ghost" className="h-auto w-full justify-start gap-2 border p-2 text-start" onClick={() => { setOpen(false); onNavigate(h.section, h.tab, h.query); }}><Badge variant="secondary">{h.kind}</Badge><span className="min-w-0 flex-1"><span className="block truncate">{h.label}</span><span className="block truncate text-xs text-muted-foreground">{h.sub}</span></span><ArrowUpLeft className="size-4 shrink-0" /></Button>)}</div></DialogContent></Dialog></>;
}