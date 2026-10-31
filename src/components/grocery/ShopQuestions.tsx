import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

export default function ShopQuestions({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("product_questions").select("id,question,answer,created_at,grocery_products(name)").eq("store_id", storeId).order("created_at", { ascending: false }).limit(50);
    if (error) return toast.error("سوالات نہیں کھل سکے");
    setRows(data || []);
  }, [storeId]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 20000);
    return () => clearInterval(timer);
  }, [load]);
  const answer = async (id: string) => {
    const text = drafts[id]?.trim();
    if (!text) return;
    setBusy(id);
    const { error } = await supabase.from("product_questions").update({ answer: text }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setDrafts(d => ({ ...d, [id]: "" }));
    toast.success("جواب گاہک کو بھیج دیا گیا");
    void load();
  };
  return <section className="space-y-3 py-4">
    <header className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><MessageCircle className="size-4" /> سوالات / Questions ({rows.filter(r => !r.answer).length})</h2><Button size="icon" variant="ghost" aria-label="تازہ کریں" onClick={load}><RefreshCw className="size-4" /></Button></header>
    {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">ابھی کوئی سوال نہیں</p>}
    {rows.map(r => <article key={r.id} className="space-y-2 rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{r.grocery_products?.name}</p><p className="text-sm font-bold">{r.question}</p>{r.answer ? <p className="border-s-2 border-primary ps-3 text-sm">{r.answer}</p> : <div className="flex gap-2"><Textarea aria-label="جواب لکھیں" placeholder="جواب لکھیں" rows={2} maxLength={2000} value={drafts[r.id] || ""} onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))} /><Button aria-label="جواب بھیجیں" size="icon" disabled={busy === r.id || !drafts[r.id]?.trim()} onClick={() => answer(r.id)}><Send className="size-4" /></Button></div>}</article>)}
  </section>;
}