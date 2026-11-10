import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n/tr";

export default function BusinessLocationRequest({ id, name, kind }: { id: string; name: string; kind: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!user || details.trim().length < 8) return;
    setBusy(true);
    const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, category: "other", order_kind: "food", description: `Business relocation: ${kind} ${id} — ${name}\n${details.trim()}`.slice(0, 1000) });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Request sent to the team", "درخواست ٹیم کو بھیج دی گئی")); setOpen(false); setDetails("");
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm"><MapPin className="me-1.5 size-3.5" />{tr("Request location change", "مقام بدلنے کی درخواست")}</Button></DialogTrigger><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{tr("Request location change", "مقام بدلنے کی درخواست")}</DialogTitle></DialogHeader><Textarea aria-label={tr("New address and reason", "نیا پتہ اور وجہ")} placeholder={tr("New address, map link and reason", "نیا پتہ، نقشے کا لنک اور تبدیلی کی وجہ")} value={details} onChange={e => setDetails(e.target.value)} maxLength={800} /><Button disabled={busy || !user || details.trim().length < 8} onClick={() => void send()}>{tr("Send request", "درخواست بھیجیں")}</Button></DialogContent></Dialog>;
}