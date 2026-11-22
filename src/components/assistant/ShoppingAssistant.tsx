import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, Loader2, Search, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { isShopPage } from "@/components/cart/FloatingCartBar";

const HIDDEN = [/^\/rider/, /^\/admin/, /^\/reels/, /^\/auth/, /^\/checkout/, /^\/store\//, /^\/staff/, /^\/support/, /^\/product\//];
type Found = { id: string; name: string; price: number; list_price: number; image_url: string | null; rating: number | null; shop: string };

/** Free AI helper: find items in plain Urdu/English and get app-usage help for customers and partners. */
const ShoppingAssistant = ({ inline = false }: { inline?: boolean }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"find" | "help">("find");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);
  const [err, setErr] = useState("");
  if (HIDDEN.some((r) => r.test(pathname)) || (pathname === "/grocery" && !inline)) return null;

  const ask = async () => {
    if (text.trim().length < 2 || busy) return;
    setBusy(true); setErr(""); setReply(""); setFound(null);
    const { data, error } = await supabase.functions.invoke("shopping-assistant", { body: { mode, text, lang } });
    let msg = data?.error;
    if (error && !msg) { try { msg = (await (error as any)?.context?.json())?.error; } catch { /* ignore */ } }
    setBusy(false);
    if (error || msg) { setErr(msg || L("Something went wrong, try again", "کچھ غلط ہو گیا، دوبارہ کوشش کریں")); return; }
    if (mode === "help") setReply(data.answer || ""); else { setReply(data.reply || ""); setFound(data.products || []); }
  };
  const examples = mode === "find"
    ? [L("Smart watch under 3000", "3000 سے کم اسمارٹ واچ"), L("Kids shoes", "بچوں کے جوتے"), L("Steam iron", "استری")]
    : [L("How do I place an order?", "آرڈر کیسے دوں؟"), L("How do I add products to my shop?", "دکان میں چیزیں کیسے لگاؤں؟"), L("How do I track my order?", "آرڈر کہاں ہے کیسے دیکھوں؟")];

  return (<>
    <Button aria-label={L("AI helper", "AI مددگار")} onClick={() => setOpen(true)} className={inline ? "h-10 gap-1.5 text-xs" : `fixed ${totalItems > 0 && isShopPage(pathname) ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"} start-3 z-40 flex h-11 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/30`}>
      <Sparkles className="h-4 w-4" />{L("Ask AI", "AI سے پوچھیں")}
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{L("EasyLife AI helper (free)", "ایزی لائف AI مددگار (مفت)")}</SheetTitle></SheetHeader>
        <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
          <Button role="tab" aria-selected={mode === "find"} variant={mode === "find" ? "default" : "outline"} size="sm" onClick={() => { setMode("find"); setReply(""); setFound(null); setErr(""); }}><Search className="me-1 h-4 w-4" />{L("Find an item", "چیز ڈھونڈیں")}</Button>
          <Button role="tab" aria-selected={mode === "help"} variant={mode === "help" ? "default" : "outline"} size="sm" onClick={() => { setMode("help"); setReply(""); setFound(null); setErr(""); }}><HelpCircle className="me-1 h-4 w-4" />{L("App help", "ایپ مدد")}</Button>
        </div>
        {!user ? <div className="mt-4 rounded-xl bg-secondary/40 p-4 text-center text-sm"><p>{L("Please sign in to use the AI helper.", "AI مددگار کے لیے پہلے لاگ ان کریں۔")}</p><Button className="mt-3" size="sm" onClick={() => { setOpen(false); navigate("/auth"); }}>{L("Sign in", "لاگ ان")}</Button></div> : <>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <Input dir="auto" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={mode === "find" ? L("e.g. warm suit under 2000", "مثلاً 2000 سے کم گرم سوٹ") : L("Ask how to use the app", "ایپ کے بارے میں پوچھیں")} aria-label={L("Your question", "آپ کا سوال")} />
            <Button type="submit" disabled={busy || text.trim().length < 2}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : L("Ask", "پوچھیں")}</Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">{examples.map((ex) => <button key={ex} type="button" className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground" onClick={() => setText(ex)}>{ex}</button>)}</div>
          {err && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{err}</p>}
          {reply && <p className="mt-3 whitespace-pre-line rounded-xl bg-accent/50 p-3 text-sm leading-6 text-foreground" dir="auto" data-testid="assistant-reply">{reply}</p>}
          {found && (found.length === 0 ? <p className="mt-3 text-center text-xs text-muted-foreground">{L("No matching items in shops yet. Try other words.", "ابھی دکانوں میں ایسی چیز نہیں ملی۔ دوسرے الفاظ آزمائیں۔")}</p> :
            <div className="mt-3 grid grid-cols-2 gap-2" data-testid="assistant-results">{found.map((p) => (
              <button key={p.id} type="button" className="overflow-hidden rounded-xl border border-border bg-card text-start" onClick={() => { setOpen(false); navigate(`/product/${p.id}`); }}>
                <div className="aspect-square bg-card p-1.5">{p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}</div>
                <div className="p-2"><p className="line-clamp-2 text-xs font-bold text-foreground" dir="auto">{p.name}</p><p className="text-sm font-extrabold text-primary">Rs {p.price.toLocaleString()}</p><p className="line-clamp-1 text-[10px] text-muted-foreground">{p.rating ? <><Star className="inline size-3 fill-primary text-primary" /> {Number(p.rating).toFixed(1)} · </> : null}{p.shop}</p></div>
              </button>))}</div>)}
          <p className="mt-3 text-[10px] text-muted-foreground">{L("Free · up to 30 questions a day · prices and stock come from shops, not AI.", "مفت · روزانہ 30 سوال تک · ریٹ اور اسٹاک دکانوں سے آتے ہیں، AI سے نہیں۔")}</p>
        </>}
      </SheetContent>
    </Sheet>
  </>);
};
export default ShoppingAssistant;
