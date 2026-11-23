import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";

export default function OperationConfirmDialog({ title, onClose, onConfirm, reasons = [] }: {
  title: string; onClose: () => void; onConfirm: (note: string) => Promise<void>; reasons?: string[];
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const save = async () => {
    if (lock.current || note.trim().length < 3) return;
    lock.current = true; setBusy(true);
    try { await onConfirm(note.trim()); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : tr("Could not save", "محفوظ نہیں ہو سکا")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !lock.current) onClose(); }}>
    <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {reasons.length > 0 && <div className="flex flex-wrap gap-2">{reasons.map(reason => <Button key={reason} variant={note === reason ? "secondary" : "outline"} size="sm" disabled={busy} onClick={() => setNote(reason)}>{reason}</Button>)}</div>}
      <Textarea aria-label={tr("Confirmation note", "تصدیقی نوٹ")} value={note} disabled={busy} onChange={e => setNote(e.target.value)} placeholder={tr("Reason / delivery evidence", "وجہ / ڈیلیوری کی تصدیق")} maxLength={1000} />
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>{tr("Close", "بند کریں")}</Button><Button disabled={busy || note.trim().length < 3} onClick={() => void save()}>{busy ? tr("Saving…", "محفوظ ہو رہا ہے…") : tr("Confirm", "تصدیق کریں")}</Button></div>
    </DialogContent>
  </Dialog>;
}