import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { enableNativePush } from "@/lib/nativePush";
import { enableWebPush } from "@/lib/webPush";

/** Warns a rider whose phone is not registered for closed-app offer alerts. */
export default function RiderPushGuard({ userId }: { userId: string }) {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    void (supabase as any).from("device_tokens").select("id", { count: "exact", head: true }).eq("user_id", userId)
      .then(({ count, error }: { count: number | null; error: unknown }) => { if (!off && !error) setRegistered((count ?? 0) > 0); });
    return () => { off = true; };
  }, [userId]);

  if (registered !== false) return null;

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = Capacitor.isNativePlatform() ? await enableNativePush() : await enableWebPush(userId);
      if (r === "registered") { setRegistered(true); toast.success("اطلاعات چالو ہو گئیں — اب بند ایپ پر بھی آفر آئے گی"); }
      else toast.error("فون کی ترتیبات میں Easy Life کی اطلاعات (Notifications) کی اجازت دیں");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "اطلاعات چالو نہیں ہو سکیں");
    } finally { setBusy(false); }
  };

  return (
    <div role="alert" className="mx-3 mt-3 rounded-xl border-2 border-destructive bg-destructive/10 p-3" dir="rtl">
      <div className="flex items-start gap-2">
        <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-destructive">اس فون پر آرڈر کی اطلاع بند ہے</p>
          <p className="mt-0.5 text-xs text-foreground">ایپ بند ہونے پر آپ کو نئی ڈیلیوری کی آفر نہیں ملے گی۔ نیچے والا بٹن دبائیں اور «Allow» کریں۔</p>
          <Button size="sm" className="mt-2 w-full" onClick={enable} disabled={busy}>{busy ? "چالو ہو رہی ہیں..." : "اطلاعات چالو کریں"}</Button>
        </div>
      </div>
    </div>
  );
}
