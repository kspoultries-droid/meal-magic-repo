import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Clapperboard, Eye, EyeOff, Heart, Upload, ShieldCheck, Ban } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  restaurant: "🍔 ریسٹورنٹ (فوڈ)",
  grocery: "🛒 گروسری اسٹور",
  wholesale: "📦 ہول سیل (بازار)",
};

interface EntityOption { id: string; name: string; }

const ReelsTab = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [sourceType, setSourceType] = useState("restaurant");
  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [modFilter, setModFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});

  const fetchReels = async () => {
    setLoading(true);
    const { data } = await (supabase.from("reels" as any).select("*").order("sort_order").order("created_at", { ascending: false }) as any);
    setReels(data || []);
    const { data: reports } = await (supabase.from("reel_reports" as any).select("reel_id").eq("status", "new") as any);
    const counts: Record<string, number> = {};
    ((reports as any[]) || []).forEach((r) => { counts[r.reel_id] = (counts[r.reel_id] || 0) + 1; });
    setReportCounts(counts);
    setLoading(false);
  };


  const setModeration = async (id: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = prompt("مسترد کرنے کی وجہ لکھیں (دکاندار کو نظر آئے گی):", "خلافِ اصول مواد");
      if (reason === null) return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase.from("reels" as any).update({
      moderation_status: status,
      rejection_reason: reason,
      is_active: status === "approved",
      reviewed_by: auth.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "ریل منظور — اب لائیو ہے ✅" : "ریل مسترد / بلاک ⛔");
    fetchReels();
  };

  useEffect(() => { fetchReels(); }, []);


  // Load entities for the chosen source type
  useEffect(() => {
    const load = async () => {
      setSourceId("");
      if (sourceType === "restaurant") {
        const { data } = await supabase.from("restaurants").select("id, name").eq("is_active", true).order("name");
        setEntities(data || []);
      } else {
        const { data } = await (supabase.from("grocery_stores" as any)
          .select("id, name")
          .eq("is_active", true)
          .eq("store_type", sourceType === "wholesale" ? "wholesale" : "retail")
          .order("name") as any);
        setEntities(data || []);
      }
    };
    load();
  }, [sourceType]);

  const resetForm = () => {
    setSourceType("restaurant"); setSourceId(""); setTitle(""); setCaption("");
    setVideoUrl(""); setPosterUrl(""); setPrice(""); setSortOrder("0");
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadVideo = async (): Promise<string | null> => {
    const file = fileRef.current?.files?.[0];
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) { toast.error("ویڈیو 50MB سے چھوٹی ہونی چاہیے"); throw new Error("too large"); }
    const path = `reels/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("ویڈیو اپلوڈ ناکام: " + error.message); throw error; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveReel = async () => {
    if (!title.trim()) { toast.error("ٹائٹل ضروری ہے"); return; }
    setSaving(true);
    try {
      let finalVideoUrl = videoUrl.trim();
      if (!finalVideoUrl) {
        const uploaded = await uploadVideo();
        if (uploaded) finalVideoUrl = uploaded;
      }
      if (!finalVideoUrl) { toast.error("ویڈیو لنک دیں یا فائل اپلوڈ کریں"); setSaving(false); return; }

      const entity = entities.find((e) => e.id === sourceId);
      const payload = {
        source_type: sourceType,
        source_id: sourceId || null,
        source_name: entity?.name || "EasyLife",
        title: title.trim(),
        caption: caption.trim() || null,
        video_url: finalVideoUrl,
        poster_url: posterUrl.trim() || null,
        price: price ? parseFloat(price) : null,
        sort_order: parseInt(sortOrder) || 0,
        moderation_status: "approved",

      };
      const { error } = await (supabase.from("reels" as any).insert(payload) as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("ریل شائع ہو گئی! 🎬");
      resetForm();
      setDialogOpen(false);
      fetchReels();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase.from("reels" as any).update({ is_active: !current }).eq("id", id) as any);
    toast.success(!current ? "ریل فعال" : "ریل غیر فعال");
    fetchReels();
  };

  const deleteReel = async (id: string) => {
    if (!confirm("کیا آپ واقعی یہ ریل حذف کرنا چاہتے ہیں؟")) return;
    await (supabase.from("reels" as any).delete().eq("id", id) as any);
    toast.success("ریل حذف ہو گئی");
    fetchReels();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Clapperboard className="w-5 h-5" /> ریلز (فوڈ، گروسری، بازار)</CardTitle>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی ریل</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>نئی ریل شائع کریں</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">سیکشن</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                      {Object.entries(SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">دکان / ریسٹورنٹ</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                      <option value="">— انتخاب کریں —</option>
                      {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                <Input placeholder="ٹائٹل * (مثلاً آج کی سپیشل بریانی)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="کیپشن (اختیاری)" value={caption} onChange={(e) => setCaption(e.target.value)} />

                <div>
                  <label className="text-xs text-muted-foreground">ویڈیو لنک (MP4) — یا نیچے فائل اپلوڈ کریں</label>
                  <Input placeholder="https://...video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> ویڈیو فائل اپلوڈ (max 50MB)</label>
                  <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="w-full text-sm border rounded-md p-2 bg-background" />
                </div>

                <Input placeholder="پوسٹر تصویر لنک (اختیاری)" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} dir="ltr" />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">قیمت (Rs، اختیاری)</label>
                    <Input type="number" placeholder="350" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">ترتیب (Sort)</label>
                    <Input type="number" placeholder="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                  </div>
                </div>

                <Button className="w-full" onClick={saveReel} disabled={saving}>
                  {saving ? "شائع ہو رہی ہے…" : "ریل شائع کریں"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchReels}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {([
            { k: "pending", l: "⏳ زیرِ جائزہ" },
            { k: "approved", l: "✅ منظور شدہ" },
            { k: "rejected", l: "⛔ مسترد" },
            { k: "all", l: "سب" },
          ] as const).map((t) => {
            const count = t.k === "all" ? reels.length : reels.filter((r) => (r.moderation_status || "approved") === t.k).length;
            return (
              <button
                key={t.k}
                onClick={() => setModFilter(t.k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  modFilter === t.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {t.l} ({count})
              </button>
            );
          })}
        </div>
        {(() => {
          const visible = modFilter === "all" ? reels : reels.filter((r) => (r.moderation_status || "approved") === modFilter);
          return loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">اس فہرست میں کوئی ریل نہیں</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ریل</TableHead>
                  <TableHead>سیکشن</TableHead>
                  <TableHead>دکان</TableHead>
                  <TableHead>ویوز / لائکس</TableHead>
                  <TableHead>سٹیٹس</TableHead>
                  <TableHead>ایکشنز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.poster_url ? (
                          <img src={r.poster_url} alt="" className="w-9 h-14 rounded object-cover" />
                        ) : (
                          <div className="w-9 h-14 rounded bg-muted flex items-center justify-center">🎬</div>
                        )}
                        <div>
                          <p className="font-bold text-sm">{r.title}</p>
                          {r.price && <p className="text-xs text-primary font-semibold">Rs {r.price}</p>}
                          <a href={r.video_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">ویڈیو دیکھیں</a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[r.source_type] || r.source_type}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.source_name}
                      {r.owner_id && <span className="block text-[10px] text-muted-foreground">دکاندار کی بھیجی ہوئی</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {r.views} · <Heart className="w-3 h-3" /> {r.likes}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={
                          r.moderation_status === "rejected" ? "bg-destructive text-destructive-foreground"
                          : r.moderation_status === "pending" ? "bg-warning/20 text-warning-foreground border border-warning/40"
                          : "bg-success text-success-foreground"
                        }>
                          {r.moderation_status === "rejected" ? "مسترد" : r.moderation_status === "pending" ? "زیرِ جائزہ" : "منظور"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{r.is_active ? "فعال" : "غیر فعال"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.moderation_status !== "approved" && (
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => setModeration(r.id, "approved")}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> منظور
                          </Button>
                        )}
                        {r.moderation_status !== "rejected" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setModeration(r.id, "rejected")}>
                            <Ban className="h-3 w-3 mr-1" /> بلاک
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => toggleActive(r.id, r.is_active)}>
                          {r.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteReel(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </div>
        );
        })()}

      </CardContent>
    </Card>
  );
};

export default ReelsTab;
