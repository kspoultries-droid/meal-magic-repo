import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, Minus, Plus } from "lucide-react";
import { tr } from "@/lib/i18n/tr";

export default function ListOrderPhotos({ urls }: { urls: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  return <>
    <div className={`grid gap-3 ${urls.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
      {urls.map((url, i) => <Button key={`${url}-${i}`} variant="outline" className="relative h-auto w-full p-1" onClick={() => { setSelected(url); setZoom(1); }} aria-label={tr(`Open photo ${i+1}`, `تصویر ${i+1} کھولیں`)}>
        <img src={url} alt={tr(`List photo ${i+1}`, `لسٹ تصویر ${i+1}`)} className="max-h-96 w-full object-contain bg-secondary" />
        <ZoomIn className="absolute end-3 bottom-3 h-5 w-5 text-primary" />
      </Button>)}
    </div>
    <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
      <DialogContent className="max-w-[96vw] h-[92vh] flex flex-col">
        <DialogHeader><DialogTitle>{tr("Photo", "تصویر")}</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title={tr("Zoom out", "چھوٹا کریں")} onClick={() => setZoom(z => Math.max(1,z-1))}><Minus className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" title={tr("Zoom in", "بڑا کریں")} onClick={() => setZoom(z => Math.min(4,z+1))}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="overflow-auto flex-1 min-h-0">{selected && <img src={selected} alt={tr("Full photo", "مکمل تصویر")} className={`object-contain max-w-none ${zoom===1 ? "w-full" : zoom===2 ? "w-[200%]" : zoom===3 ? "w-[300%]" : "w-[400%]"}`} />}</div>
      </DialogContent>
    </Dialog>
  </>;
}