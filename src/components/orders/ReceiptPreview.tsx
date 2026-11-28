import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Printer, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RECEIPT_PREVIEW_EVENT, type ReceiptKind } from "@/lib/receiptPrint";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";
import { AppLauncher } from "@capacitor/app-launcher";
import { receiptLines, receiptPng, rawbtUrl, RAWBT_PLAY_URL } from "@/lib/receiptImage";

export default function ReceiptPreview() {
  const [receipt, setReceipt] = useState<{ html: string; kind: ReceiptKind; order?: any; opts?: any } | null>(null);
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
        <DialogDescription>{native ? tr("Bluetooth thermal printing uses the free RawBT app (pair the printer in RawBT once).", "بلوٹوتھ تھرمل پرنٹ مفت RawBT ایپ سے ہوتا ہے (پرنٹر ایک بار RawBT میں جوڑیں)۔") : tr("Order receipt", "آرڈر کی رسید")}</DialogDescription>
      </DialogHeader>
      {receipt && <iframe ref={frame} title={tr("Receipt preview", "رسید کا پیش منظر")} srcDoc={receipt.html} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="w-full h-[50dvh] border rounded-md bg-background" />}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setReceipt(null)}><ArrowLeft className="size-4 me-2" />{tr("Back to orders", "آرڈرز پر واپس")}</Button>
        {native && receipt?.order && <Button onClick={async () => {
          const url = rawbtUrl(receiptPng(receiptLines(receipt.order, receipt.kind, receipt.opts || {}), Number(localStorage.getItem("receipt_width_dots")) || 384));
          try { await AppLauncher.openUrl({ url }); }
          catch {
            toast.error(tr("RawBT printer app not found. Install it, pair your printer, then try again.", "RawBT پرنٹر ایپ نہیں ملی۔ انسٹال کر کے پرنٹر جوڑیں، پھر دوبارہ کوشش کریں۔"));
            AppLauncher.openUrl({ url: RAWBT_PLAY_URL }).catch(() => {});
          }
        }}><Printer className="size-4 me-2" />{tr("Bluetooth print", "بلوٹوتھ پرنٹ")}</Button>}
        {!native && <Button disabled={!ready} onClick={() => {
          try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
          catch { toast.error(tr("Printing is unavailable on this device", "اس آلے پر پرنٹ دستیاب نہیں")); }
        }}><Printer className="size-4 me-2" />{tr("Print", "پرنٹ")}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}