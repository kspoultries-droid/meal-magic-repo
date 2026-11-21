import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Printer, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RECEIPT_PREVIEW_EVENT, type ReceiptKind } from "@/lib/receiptPrint";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";

export default function ReceiptPreview() {
  const [receipt, setReceipt] = useState<{ html: string; kind: ReceiptKind } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const open = (event: Event) => {
      setReady(false);
      setReceipt((event as CustomEvent).detail);
    };
    window.addEventListener(RECEIPT_PREVIEW_EVENT, open);
    return () => window.removeEventListener(RECEIPT_PREVIEW_EVENT, open);
  }, []);
  const native = Capacitor.isNativePlatform();
  return <Dialog open={!!receipt} onOpenChange={open => { if (!open) setReceipt(null); }}>
    <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[90dvh] p-4" dir="rtl">
      <DialogHeader>
        <DialogTitle>{receipt?.kind === "kitchen" ? tr("Kitchen slip", "کچن سلپ") : tr("Bill", "بل")}</DialogTitle>
        <DialogDescription>{native ? tr("Printing is available from a computer browser. You can view the receipt here.", "پرنٹ کمپیوٹر کے براؤزر سے دستیاب ہے؛ یہاں رسید دیکھ سکتے ہیں۔") : tr("Order receipt", "آرڈر کی رسید")}</DialogDescription>
      </DialogHeader>
      {receipt && <iframe ref={frame} title={tr("Receipt preview", "رسید کا پیش منظر")} srcDoc={receipt.html} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="w-full h-[50dvh] border rounded-md bg-background" />}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setReceipt(null)}><ArrowLeft className="size-4 me-2" />{tr("Back to orders", "آرڈرز پر واپس")}</Button>
        {!native && <Button disabled={!ready} onClick={() => {
          try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
          catch { toast.error(tr("Printing is unavailable on this device", "اس آلے پر پرنٹ دستیاب نہیں")); }
        }}><Printer className="size-4 me-2" />{tr("Print", "پرنٹ")}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}