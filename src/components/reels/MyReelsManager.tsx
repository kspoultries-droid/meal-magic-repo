import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Clapperboard, Eye, Heart, Upload, ShieldAlert } from "lucide-react";

interface Entity { id: string; name: string; source_type: "restaurant" | "grocery" | "wholesale"; }

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "⏳ زیرِ جائزہ", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  approved: { text: "✅ منظور شدہ", cls: "bg-success text-success-foreground" },
  rejected: { text: "⛔ مسترد", cls: "bg-destructive text-destructive-foreground" },
};

interface Props {
  /** اگر دیا جائے تو صرف اسی دکان کی ریلز */
  restrictSourceId?: string;
}

const MyReelsManager = ({ restrictSourceId }: Props) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [price, setPrice] = useState("");
  const [agreed, setAgreed] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    const [{ data: rests }, { data: stores }] = await Promise.all([
      supabase.from("restaurants").select("id, name").eq("owner_id", uid),
      (supabase.from("grocery_stores" as any).select("id, name, store_type").eq("owner_id", uid) as any),
    ]);
    let list: Entity[] = [
      ...(rests || []).map((r: any) => ({ id: r.id, name: r.name, source_type: "restaurant" as const })),
      ...((stores as any[]) || []).map((s: any) => ({
        id: s.id, name: s.name,
        source_type: (s.store_type === "wholesale" ? "wholesale" : "grocery") as "wholesale" | "grocery",
      })),
    ];
    if (restrictSourceId) list = list.filter((e) => e.id === restrictSourceId);
    setEntities(list);
    setSourceId((prev) => prev || list[0]?.id || "");

    const { data: myReels } = await (supabase
      .from("reels" as any)
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false }) as any);
    setReels(((myReels as any[]) || []).filter((r) => !restrictSourceId || r.source_id === restrictSourceId));
    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [restrictSourceId]);

  const reset = () => {
    setTitle(""); setCaption(""); setVideoUrl(""); setPosterUrl(""); setPrice(""); setAgreed(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadVideo = async (): Promise<string | null> => {
    const file = fileRef.current?.files?.[0];
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) { toast.error("ویڈیو 50MB سے چھوٹی ہونی چاہیے"); throw new Error("too large"); }
    const path = `reels/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("اپلوڈ ناکام: " + error.message); throw error; }
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const save = async () => {
    const entity = entities.find((e) => e.id === sourceId);
    if (!entity) { toast.error("دکان منتخب کریں"); return; }
    if (!title.trim()) { toast.error("ٹائٹل ضروری ہے"); return; }
    if (!agreed) { toast.error("مواد کے اصولوں سے اتفاق ضروری ہے"); return; }
    setSaving(true);
    try {
      let finalUrl = videoUrl.trim();
      if (!finalUrl) finalUrl = (await uploadVideo()) || "";
      if (!finalUrl) { toast.error("ویڈیو لنک دیں یا فائل اپلوڈ کریں"); setSaving(false); return; }

      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from("reels" as any).insert({
        source_type: entity.source_type,
        source_id: entity.id,
        source_name: entity.name,
        owner_id: auth.user?.id,
        moderation_status: "pending",
        is_active: true,
        title: title.trim(),
        caption: caption.trim() || null,
        video_url: finalUrl,
        poster_url: posterUrl.trim() || null,
        price: price ? parseFloat(price) : null,
      }) as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("ریل بھیج دی گئی — ایڈمن کی منظوری کے بعد شائع ہوگی 🎬");
      reset(); setOpen(false); loadAll();
    } catch {}
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("کیا آپ واقعی یہ ریل حذف کرنا چاہتے ہیں؟")) return;
    const { error } = await (supabase.from("reels" as any).delete().eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("ریل حذف ہو گئی");
    loadAll();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base"><Clapperboard className="w-5 h-5" /> میری ریلز</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={entities.length === 0}><Plus className="h-4 w-4 mr-1" /> نئی ریل</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>اپنی پروڈکٹ کی ریل بنائیں</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {entities.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground">دکان</label>
                  <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <Input placeholder="ٹائٹل * (مثلاً نئی آمد — دیسی گھی)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="کیپشن / تفصیل (اختیاری)" value={caption} onChange={(e) => setCaption(e.target.value)} />
              <div>
                <label className="text-xs text-muted-foreground">ویڈیو لنک (MP4) — یا نیچے فائل اپلوڈ کریں</label>
                <Input placeholder="https://...video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> ویڈیو اپلوڈ (زیادہ سے زیادہ 50MB)</label>
                <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="w-full text-sm border rounded-md p-2 bg-background" />
              </div>
              <Input placeholder="پوسٹر تصویر لنک (اختیاری)" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} dir="ltr" />
              <Input type="number" placeholder="قیمت (Rs، اختیاری)" value={price} onChange={(e) => setPrice(e.target.value)} />

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2">
                <p className="flex items-center gap-1 font-bold text-destructive"><ShieldAlert className="w-4 h-4" /> مواد کے اصول</p>
                <p className="text-muted-foreground leading-relaxed">
                  صرف اپنی پروڈکٹ/دکان سے متعلق ویڈیو۔ فحش، بےہودہ، نیم برہنہ، تشدد، نفرت انگیز یا گمراہ کن مواد سختی سے ممنوع ہے —
                  ایسی ریل فوراً حذف اور اکاؤنٹ بلاک کیا جا سکتا ہے۔ ہر ریل ایڈمن کی منظوری کے بعد ہی عوام کو نظر آئے گی۔
                </p>
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  میں ان اصولوں سے متفق ہوں
                </label>
              </div>

              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? "بھیجی جا رہی ہے…" : "منظوری کے لیے بھیجیں"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">لوڈ ہو رہا ہے…</p>
        ) : entities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">آپ کی کوئی دکان رجسٹرڈ نہیں</p>
        ) : reels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">ابھی کوئی ریل نہیں — "نئی ریل" سے اپنی پروڈکٹ کی ویڈیو لگائیں</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {reels.map((r) => {
              const st = STATUS_LABEL[r.moderation_status] || STATUS_LABEL.pending;
              return (
                <div key={r.id} className="rounded-xl border border-border/60 overflow-hidden bg-card">
                  <div className="aspect-[9/14] bg-muted flex items-center justify-center">
                    {r.poster_url ? <img src={r.poster_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-3xl">🎬</span>}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-bold line-clamp-2">{r.title}</p>
                    <Badge className={`text-[10px] ${st.cls}`}>{st.text}</Badge>
                    {r.moderation_status === "rejected" && r.rejection_reason && (
                      <p className="text-[10px] text-destructive">وجہ: {r.rejection_reason}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{r.views} <Heart className="w-3 h-3 ml-1" />{r.likes}</span>
                      <button onClick={() => remove(r.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyReelsManager;
