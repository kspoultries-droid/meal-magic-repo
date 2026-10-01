import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enableWebPush } from "@/lib/webPush";

type Notif = { id: string; title: string; body: string | null; path: string | null; kind: string; read_at: string | null; created_at: string };

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ابھی";
  if (m < 60) return `${m} منٹ پہلے`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} گھنٹے پہلے`;
  return `${Math.floor(h / 24)} دن پہلے`;
};

const NotificationBell = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    const db = supabase as any;
    db.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }: any) => setItems(data || []));
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (p) => {
        const n = p.new as Notif;
        setItems((prev) => [n, ...prev].slice(0, 30));
        toast(n.title, { description: n.body || undefined, id: `n-${n.id}` });
        try {
          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            new Notification(n.title, { body: n.body || undefined, icon: "/pwa-192x192.png" });
          }
          if (n.kind === "offer" || n.kind === "new_order") navigator.vibrate?.([300, 100, 300]);
        } catch { /* ignore */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Permission pehle se mili ho to device khud register karo (warna button chhupa rehta hai aur token kabhi save nahi hota)
  useEffect(() => {
    if (!user || !("Notification" in window) || Notification.permission !== "granted" || window.top !== window.self) return;
    enableWebPush(user.id).catch((e) => console.error("auto push register", e));
  }, [user?.id]);

  if (!user) return null;
  const unread = items.filter((i) => !i.read_at).length;

  const markAll = async () => {
    const now = new Date().toISOString();
    setItems((p) => p.map((i) => ({ ...i, read_at: i.read_at || now })));
    await (supabase as any).from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  };

  const openItem = async (n: Notif) => {
    if (!n.read_at) {
      setItems((p) => p.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    setOpen(false);
    if (n.path?.startsWith("/")) navigate(n.path);
  };

  const askPermission = async () => {
    if (window.top !== window.self) return toast.info("اطلاعات چالو کرنے کے لیے ایپ الگ ٹیب میں کھولیں");
    let r: string = "not-configured";
    try { r = await enableWebPush(user.id); } catch (e) { console.error(e); }
    if (r === "not-configured" || r === "unsupported") {
      if (!("Notification" in window)) return toast.error("یہ براؤزر اطلاعات سپورٹ نہیں کرتا");
      r = (await Notification.requestPermission()) === "granted" ? "registered" : "denied";
    }
    if (r === "registered") toast.success("اطلاعات چالو ہو گئیں");
    else if (r === "open-in-new-tab") toast.info("ایپ الگ ٹیب میں کھولیں");
    else toast.error("اجازت نہیں ملی — براؤزر سیٹنگ سے چالو کریں");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="اطلاعات" className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent/40 ${className}`}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-[18px] text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-bold">اطلاعات</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAll}><CheckCheck className="h-3.5 w-3.5" /> سب پڑھ لیں</Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">کوئی اطلاع نہیں</p>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => openItem(n)} className={`block w-full border-b px-3 py-2 text-start hover:bg-accent/40 ${n.read_at ? "" : "bg-primary/5"}`}>
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {"Notification" in window && Notification.permission !== "granted" && (
          <button onClick={askPermission} className="w-full border-t py-2 text-xs font-semibold text-primary">🔔 فون/براؤزر پر اطلاعات چالو کریں</button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
