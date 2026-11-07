import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { listPhotos, type ListPrinter } from "@/lib/listOrders";
import { toast } from "sonner";

export default function ListOrderPrint({ order, storeId }: { order: any; storeId: string }) {
  const key = `list-printer:${storeId}`;
  const [printer, setPrinter] = useState<ListPrinter>(() => {
    try { const v=localStorage.getItem(key); return v==='usb80'||v==='bluetooth80' ? v : 'a4'; } catch { return 'a4'; }
  });
  const [printing, setPrinting] = useState(false);
  const print = async () => {
    setPrinting(true);
    await new Promise(resolve => setTimeout(resolve,100));
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.ration-print-root img'));
    await Promise.all(images.map(img => img.decode().catch(() => undefined)));
    document.body.classList.toggle('ration-paper-thermal', printer !== 'a4');
    window.print();
    document.body.classList.remove('ration-paper-thermal');
    setPrinting(false);
  };
  return <>
    <div className="flex gap-2 items-center flex-wrap">
      <Select value={printer} onValueChange={(v: ListPrinter) => { setPrinter(v); try { localStorage.setItem(key,v); } catch {toast.error(tr("Printer preference could not be saved", "پرنٹر کی ترجیح محفوظ نہیں ہو سکی"));} }}>
        <SelectTrigger className="w-48" aria-label={tr("Printer type", "پرنٹر کی قسم")}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="a4">A4</SelectItem><SelectItem value="usb80">USB — 80mm</SelectItem><SelectItem value="bluetooth80">Bluetooth — 80mm</SelectItem></SelectContent>
      </Select>
      <Button variant="outline" disabled={printing} onClick={print} className="gap-2"><Printer className="h-4 w-4" />{tr("Print", "پرنٹ")}</Button>
    </div>
    {printing && createPortal(<div className={`ration-print-root ${printer==='a4'?'ration-print-a4':'ration-print-thermal'}`}>
      <h1>{tr("Ration list", "راشن لسٹ")} #{order.id.slice(0,8)}</h1>
      <p>{order.delivery_address}</p><p>{order.notes}</p><p>{order.customer_revision}</p>
      {listPhotos(order).map((url,i)=><img key={i} src={url} alt={`List ${i+1}`} />)}
      {order.bill_image_url && <img src={order.bill_image_url} alt="Bill" />}
    </div>,document.body)}
  </>;
}