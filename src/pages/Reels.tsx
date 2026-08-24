import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, Eye, Share2, Volume2, VolumeX, Play, ShoppingBag, Store, Package, UtensilsCrossed, Flag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


interface Reel {
  id: string;
  source_type: "restaurant" | "grocery" | "wholesale";
  source_id: string | null;
  source_name: string;
  title: string;
  caption: string | null;
  video_url: string;
  poster_url: string | null;
  price: number | null;
  views: number;
  likes: number;
}

const FILTERS = [
  { key: "all", label: "سب", icon: null },
  { key: "restaurant", label: "کھانا", icon: UtensilsCrossed },
  { key: "grocery", label: "گروسری", icon: Store },
  { key: "wholesale", label: "بازار", icon: Package },
] as const;

const SOURCE_BADGE: Record<string, string> = {
  restaurant: "🍔 فوڈ",
  grocery: "🛒 گروسری",
  wholesale: "📦 بازار",
};

const LIKED_KEY = "easylife:liked-reels";

const REPORT_REASONS = [
  { key: "obscene", label: "فحش / بےہودہ مواد" },
  { key: "violence", label: "تشدد یا نفرت انگیز" },
  { key: "misleading", label: "گمراہ کن / جھوٹی معلومات" },
  { key: "spam", label: "اسپام یا غیر متعلقہ" },
  { key: "other", label: "دیگر وجہ" },
];


const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); } catch { return new Set(); }
  });
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [reportReel, setReportReel] = useState<Reel | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());


  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase
        .from("reels" as any)
        .select("*")
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }) as any);

      setReels(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? reels : reels.filter((r) => r.source_type === filter);

  // Track which reel is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActiveId((e.target as HTMLElement).dataset.reelId || null);
            setPaused(false);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    container.querySelectorAll("[data-reel-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered.length]);

  // Play active, pause others, count view once
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === activeId) {
        video.muted = muted;
        video.play().catch(() => {});
        if (!viewedRef.current.has(id)) {
          viewedRef.current.add(id);
          if (user) (supabase.rpc("increment_reel_views" as any, { _reel_id: id } as any) as any).then(() => {});
          setReels((prev) => prev.map((r) => (r.id === id ? { ...r, views: r.views + 1 } : r)));
        }
      } else {
        video.pause();
      }
    });
  }, [activeId, muted, user]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const togglePlay = useCallback(() => {
    if (!activeId) return;
    const video = videoRefs.current.get(activeId);
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); setPaused(false); }
    else { video.pause(); setPaused(true); }
  }, [activeId]);

  const likeReel = useCallback((reel: Reel) => {
    if (liked.has(reel.id)) return;
    const next = new Set(liked).add(reel.id);
    setLiked(next);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
    setReels((prev) => prev.map((r) => (r.id === reel.id ? { ...r, likes: r.likes + 1 } : r)));
    if (user) (supabase.rpc("like_reel" as any, { _reel_id: reel.id } as any) as any).then(() => {});
  }, [liked, user]);

  const shareReel = useCallback(async (reel: Reel) => {
    const url = `${window.location.origin}/reels`;
    const text = `${reel.title} — ${reel.source_name} | EasyLife`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("لنک کاپی ہو گیا!");
    }
  }, []);

  const goToSource = useCallback((reel: Reel) => {
    if (!reel.source_id) return;
    if (reel.source_type === "restaurant") navigate(`/restaurant/${reel.source_id}`);
    else navigate(`/grocery/${reel.source_id}`);
  }, [navigate]);

  const openReport = useCallback((reel: Reel) => {
    if (!user) { toast.error("رپورٹ کے لیے لاگ اِن ضروری ہے"); return; }
    if (reported.has(reel.id)) { toast.info("آپ پہلے ہی یہ ریل رپورٹ کر چکے ہیں"); return; }
    setReportReel(reel); setReportReason(""); setReportDetails("");
  }, [user, reported]);

  const submitReport = async () => {
    if (!reportReel) return;
    if (!reportReason) { toast.error("وجہ منتخب کریں"); return; }
    setReporting(true);
    const { error } = await (supabase.from("reel_reports" as any).insert({
      reel_id: reportReel.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    }) as any);
    setReporting(false);
    if (error) {
      if ((error as any).code === "23505") {
        toast.info("آپ پہلے ہی یہ ریل رپورٹ کر چکے ہیں");
        setReported((p) => new Set(p).add(reportReel.id));
        setReportReel(null);
        return;
      }
      toast.error("رپورٹ نہ بھیجی جا سکی: " + error.message);
      return;
    }
    setReported((p) => new Set(p).add(reportReel.id));
    setReportReel(null);
    toast.success("شکریہ! رپورٹ ایڈمن کو بھیج دی گئی 🚩");
  };



  return (
    <div className="fixed inset-0 bg-black z-[60]">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
            aria-label="واپس"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-extrabold text-sm">EasyLife ریلز</span>
        </div>
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/80 backdrop-blur"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={containerRef} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white/60">ریلز لوڈ ہو رہی ہیں…</div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/60 gap-2">
            <Play className="w-10 h-10 opacity-40" />
            <p>ابھی کوئی ریل دستیاب نہیں</p>
          </div>
        ) : (
          filtered.map((reel) => {
            const isLiked = liked.has(reel.id);
            const isActive = activeId === reel.id;
            return (
              <section key={reel.id} data-reel-id={reel.id} className="h-[100dvh] snap-start relative">
                <video
                  ref={(el) => { if (el) videoRefs.current.set(reel.id, el); else videoRefs.current.delete(reel.id); }}
                  src={reel.video_url}
                  poster={reel.poster_url || undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted={muted}
                  playsInline
                  preload={isActive ? "auto" : "metadata"}
                  onClick={togglePlay}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                {/* Paused indicator */}
                {isActive && paused && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                )}

                {/* Right action rail */}
                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
                  <button onClick={() => likeReel(reel)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform" aria-label="پسند">
                    <Heart className={`w-8 h-8 drop-shadow-lg transition-colors ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
                    <span className="text-white text-xs font-bold drop-shadow">{reel.likes}</span>
                  </button>
                  <div className="flex flex-col items-center gap-1">
                    <Eye className="w-7 h-7 text-white drop-shadow-lg" />
                    <span className="text-white text-xs font-bold drop-shadow">{reel.views}</span>
                  </div>
                  <button onClick={() => shareReel(reel)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform" aria-label="شیئر">
                    <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
                    <span className="text-white text-[10px] font-bold drop-shadow">شیئر</span>
                  </button>
                  <button onClick={toggleMute} className="flex flex-col items-center active:scale-90 transition-transform" aria-label="آواز">
                    {muted ? <VolumeX className="w-7 h-7 text-white drop-shadow-lg" /> : <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />}
                  </button>
                  <button onClick={() => openReport(reel)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform" aria-label="رپورٹ کریں">
                    <Flag className={`w-7 h-7 drop-shadow-lg ${reported.has(reel.id) ? "text-red-500 fill-red-500" : "text-white"}`} />
                    <span className="text-white text-[10px] font-bold drop-shadow">رپورٹ</span>
                  </button>
                </div>


                {/* Bottom info */}
                <div className="absolute left-0 right-16 bottom-0 p-4 pb-8 z-10">
                  <button onClick={() => goToSource(reel)} className="flex items-center gap-2 mb-2 active:scale-95 transition-transform">
                    <span className="text-[10px] bg-white/15 backdrop-blur text-white px-2 py-0.5 rounded-full font-semibold">
                      {SOURCE_BADGE[reel.source_type]}
                    </span>
                    <span className="text-white font-bold text-sm drop-shadow">{reel.source_name}</span>
                  </button>
                  <h2 className="text-white font-extrabold text-lg leading-snug drop-shadow">{reel.title}</h2>
                  {reel.caption && <p className="text-white/80 text-xs mt-1 line-clamp-2 drop-shadow">{reel.caption}</p>}
                  {reel.source_id && (
                    <button
                      onClick={() => goToSource(reel)}
                      className="mt-3 flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-full shadow-glow active:scale-95 transition-transform"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {reel.price ? `Rs ${reel.price} — آرڈر کریں` : "ابھی آرڈر کریں"}
                    </button>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      <Dialog open={!!reportReel} onOpenChange={(o) => !o && setReportReel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Flag className="w-4 h-4 text-destructive" /> ریل رپورٹ کریں
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">{reportReel?.title}</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label key={r.key} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${reportReason === r.key ? "border-destructive bg-destructive/5 font-semibold" : "border-border"}`}>
                <input type="radio" name="reel-report-reason" value={r.key} checked={reportReason === r.key} onChange={() => setReportReason(r.key)} />
                {r.label}
              </label>
            ))}
            <Textarea placeholder="مزید تفصیل (اختیاری)" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} maxLength={500} rows={3} />
            <Button variant="destructive" className="w-full" onClick={submitReport} disabled={reporting}>
              {reporting ? "بھیجی جا رہی ہے…" : "رپورٹ بھیجیں"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">جھوٹی رپورٹس پر اکاؤنٹ محدود کیا جا سکتا ہے۔</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default Reels;
