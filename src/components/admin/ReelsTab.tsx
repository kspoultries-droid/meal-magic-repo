import { tr } from "@/lib/i18n/tr";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getVideoDuration, isReelTooLong } from "@/lib/videoDuration";
import { Plus, Trash2, RefreshCw, Clapperboard, Eye, EyeOff, Heart, Upload, ShieldCheck, Ban } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  restaurant: tr("🍔 Restaurants (Food)", "🍔 ریسٹورنٹ (فوڈ)"),
  grocery: tr("🛒 Grocery Store", "🛒 گروسری اسٹور"),
  wholesale: tr("📦 Wholesale (Market)", "📦 ہول سیل (بازار)"),
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
      reason = prompt(tr("Enter rejection reason (visible to vendor):", "مسترد کرنے کی وجہ لکھیں (دکاندار کو نظر آئے گی):"), tr("Inappropriate Content", "خلافِ اصول مواد"));
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
    toast.success(status === "approved" ? tr("Reel Approved — Now Live ✅", "ریل منظور — اب لائیو ہے ✅") : tr("Reel Rejected / Blocked ⛔", "ریل مسترد / بلاک ⛔"));
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
    try { if (isReelTooLong(await getVideoDuration(file))) { toast.error(tr("Video must be 45 seconds or shorter", "ویڈیو 45 سیکنڈ سے لمبی ہے، چھوٹی ویڈیو منتخب کریں")); throw new Error("too long"); } } catch (e) { if ((e as Error).message === "too long") throw e; }
    if (file.size > 50 * 1024 * 1024) { toast.error(tr("Video must be under 50MB", "ویڈیو 50MB سے چھوٹی ہونی چاہیے")); throw new Error("too large"); }
    const path = `reels/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error(tr("Video upload failed: ", "ویڈیو اپلوڈ ناکام: ") + error.message); throw error; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveReel = async () => {
    if (!title.trim()) { toast.error(tr("Title is required", "ٹائٹل ضروری ہے")); return; }
    setSaving(true);
    try {
      let finalVideoUrl = videoUrl.trim();
      if (!finalVideoUrl) {
        const uploaded = await uploadVideo();
        if (uploaded) finalVideoUrl = uploaded;
      }
      if (!finalVideoUrl) { toast.error(tr("Add video link or upload file", "ویڈیو لنک دیں یا فائل اپلوڈ کریں")); setSaving(false); return; }

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
      toast.success(tr("Reel published! 🎬", "ریل شائع ہو گئی! 🎬"));
      resetForm();
      setDialogOpen(false);
      fetchReels();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase.from("reels" as any).update({ is_active: !current }).eq("id", id) as any);
    toast.success(!current ? tr("Reel active", "ریل فعال") : tr("Reel inactive", "ریل غیر فعال"));
    fetchReels();
  };

  const deleteReel = async (id: string) => {
    if (!confirm(tr("Are you sure you want to delete this reel?", "کیا آپ واقعی یہ ریل حذف کرنا چاہتے ہیں؟"))) return;
    await (supabase.from("reels" as any).delete().eq("id", id) as any);
    toast.success(tr("Reel deleted", "ریل حذف ہو گئی"));
    fetchReels();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Clapperboard className="w-5 h-5" /> {tr("Reels (Food, Grocery, Bazaar)", "ریلز (فوڈ، گروسری، بازار)")}</CardTitle>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {tr("New Reel", "نئی ریل")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr("Publish New Reel", "نئی ریل شائع کریں")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Section", "سیکشن")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                      {Object.entries(SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Store / Restaurant", "دکان / ریسٹورنٹ")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                      <option value="">{tr("— Select —", "— انتخاب کریں —")}</option>
                      {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                <Input placeholder={tr("Title * (e.g. Today's Special Biryani)", "ٹائٹل * (مثلاً آج کی سپیشل بریانی)")} value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder={tr("Caption (Optional)", "کیپشن (اختیاری)")} value={caption} onChange={(e) => setCaption(e.target.value)} />

                <div>
                  <label className="text-xs text-muted-foreground">{tr("Video Link (MP4) — or upload file below", "ویڈیو لنک (MP4) — یا نیچے فائل اپلوڈ کریں")}</label>
                  <Input placeholder="https://...video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> {tr("Upload video file (max 50MB)", "ویڈیو فائل اپلوڈ (max 50MB)")}</label>
                  <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="w-full text-sm border rounded-md p-2 bg-background" />
                </div>

                <Input placeholder={tr("Poster image link (optional)", "پوسٹر تصویر لنک (اختیاری)")} value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} dir="ltr" />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Price (Rs, optional)", "قیمت (Rs، اختیاری)")}</label>
                    <Input type="number" placeholder="350" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Sort", "ترتیب (Sort)")}</label>
                    <Input type="number" placeholder="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                  </div>
                </div>

                <Button className="w-full" onClick={saveReel} disabled={saving}>
                  {saving ? tr("Publishing…", "شائع ہو رہی ہے…") : tr("Publish Reel", "ریل شائع کریں")}
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
            { k: "pending", l: tr("⏳ Under review", "⏳ زیرِ جائزہ") },
            { k: "approved", l: tr("✅ Approved", "✅ منظور شدہ") },
            { k: "rejected", l: tr("⛔ Rejected", "⛔ مسترد") },
            { k: "all", l: tr("All", "سب") },
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
          return loading ? <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{tr("No reels in this list", "اس فہرست میں کوئی ریل نہیں")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Reels", "ریل")}</TableHead>
                  <TableHead>{tr("Section", "سیکشن")}</TableHead>
                  <TableHead>{tr("Shop", "دکان")}</TableHead>
                  <TableHead>{tr("Views / Likes", "ویوز / لائکس")}</TableHead>
                  <TableHead>{tr("Status", "سٹیٹس")}</TableHead>
                  <TableHead>{tr("Actions", "ایکشنز")}</TableHead>
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
                          <a href={r.video_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">{tr("Watch Video", "ویڈیو دیکھیں")}</a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[r.source_type] || r.source_type}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.source_name}
                      {r.owner_id && <span className="block text-[10px] text-muted-foreground">{tr("Sent by Vendor", "دکاندار کی بھیجی ہوئی")}</span>}
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
                          {r.moderation_status === "rejected" ? tr("Rejected", "مسترد") : r.moderation_status === "pending" ? tr("Under Review", "زیرِ جائزہ") : tr("Approved", "منظور")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{r.is_active ? tr("Active", "فعال") : tr("Inactive", "غیر فعال")}</span>
                        {reportCounts[r.id] > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground text-[10px]">🚩 {reportCounts[r.id]} {tr("Reports", "رپورٹس")}</Badge>
                        )}

                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.moderation_status !== "approved" && (
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => setModeration(r.id, "approved")}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> {tr("Approved", "منظور")}
                          </Button>
                        )}
                        {r.moderation_status !== "rejected" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setModeration(r.id, "rejected")}>
                            <Ban className="h-3 w-3 mr-1" /> {tr("Block", "بلاک")}
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
