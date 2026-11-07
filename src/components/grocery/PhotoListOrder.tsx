import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeliveryLocation } from "@/hooks/useDeliveryLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LocationSheet from "@/components/location/LocationSheet";
import { Camera, FileImage, Send, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n/tr";
import { MAX_LIST_PHOTOS, validListPin } from "@/lib/listOrders";

interface PhotoListOrderProps { storeId: string; storeName: string; advancePercent?: number; }
export default function PhotoListOrder({storeId, storeName}: PhotoListOrderProps) {
  const {user} = useAuth();
  const {location, saved, saveNew} = useDeliveryLocation();
  const [open,setOpen]=useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [previews,setPreviews]=useState<string[]>([]);
  const [notes,setNotes]=useState("");
  const [address,setAddress]=useState("");
  const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null);
  const [locOpen,setLocOpen]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const camera=useRef<HTMLInputElement>(null), gallery=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(location){setAddress(location.address);setCoords(validListPin(location.lat,location.lng)?{lat:Number(location.lat),lng:Number(location.lng)}:null);}},[location]);
  useEffect(()=>{const urls=files.map(f=>URL.createObjectURL(f));setPreviews(urls);return ()=>urls.forEach(URL.revokeObjectURL);},[files]);
  const addFiles=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const incoming=Array.from(e.target.files||[]); e.target.value="";
    if(incoming.some(f=>!f.type.startsWith('image/')||f.size>10*1024*1024)){toast.error(tr("Images must be smaller than 10MB", "تصویر 10MB سے چھوٹی ہونی چاہیے"));return;}
    if(files.length+incoming.length>MAX_LIST_PHOTOS){toast.error(tr("Maximum 4 photos", "زیادہ سے زیادہ 4 تصاویر"));return;}
    setFiles(prev=>[...prev,...incoming]);
  };
  const submit=async()=>{
    if(!user){toast.error(tr("Please sign in", "پہلے لاگ ان کریں"));return;}
    if(!files.length||!address.trim()||!coords){toast.error(tr("Photo, address and location are required", "تصویر، پتہ اور مقام درکار ہیں"));return;}
    setSubmitting(true);
    const paths:string[]=[];
    try{
      const urls:string[]=[];
      for(const file of files){
        const path=`list-orders/${user.id}/${crypto.randomUUID()}.${file.name.split('.').pop()||'jpg'}`;
        const {error}=await supabase.storage.from('product-images').upload(path,file);if(error)throw error;
        paths.push(path);urls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
      }
      const {error}=await supabase.from('grocery_list_orders').insert({customer_id:user.id,store_id:storeId,image_url:urls[0],image_urls:urls,notes:notes.trim()||null,delivery_address:address.trim(),delivery_lat:coords.lat,delivery_lng:coords.lng});
      if(error)throw error;
      if(!saved.some(a=>a.address===address.trim()&&a.lat===coords.lat&&a.lng===coords.lng)) await saveNew({label:tr("My address","میرا پتہ"),address:address.trim(),lat:coords.lat,lng:coords.lng});
      toast.success(tr("List sent", "راشن لسٹ بھیج دی گئی"));setOpen(false);setFiles([]);setNotes("");
    }catch(err:any){if(paths.length)await supabase.storage.from('product-images').remove(paths);toast.error(err.message);}finally{setSubmitting(false);}
  };
  return <><Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="w-full gap-2"><FileImage className="h-4 w-4"/>{tr("Send list photo","راشن لسٹ بھیجیں")}</Button></DialogTrigger>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{tr("Ration list","راشن لسٹ")} — {storeName}</DialogTitle></DialogHeader>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={addFiles}/>
      <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={addFiles}/>
      <div className="grid grid-cols-2 gap-2">{previews.map((url,i)=><div key={url} className="relative"><img src={url} alt={`List ${i+1}`} className="w-full h-44 object-contain bg-secondary border rounded-lg"/><Button size="icon" variant="destructive" className="absolute top-1 end-1 h-7 w-7" aria-label={tr("Remove photo","تصویر ہٹائیں")} onClick={()=>setFiles(f=>f.filter((_,n)=>n!==i))}><X className="h-4 w-4"/></Button></div>)}</div>
      <div className="flex gap-2"><Button variant="outline" disabled={files.length>=4} onClick={()=>camera.current?.click()} className="flex-1 gap-2"><Camera className="h-4 w-4"/>{tr("Camera","کیمرہ")}</Button><Button variant="outline" disabled={files.length>=4} onClick={()=>gallery.current?.click()} className="flex-1 gap-2"><FileImage className="h-4 w-4"/>{tr("Gallery","گیلری")} ({files.length}/4)</Button></div>
      <Input aria-label={tr("Delivery address","ڈیلیوری پتہ")} value={address} placeholder={tr("Delivery address","ڈیلیوری پتہ")} onChange={e=>setAddress(e.target.value)}/>
      <Button variant="outline" onClick={()=>setLocOpen(true)} className="gap-2"><MapPin className="h-4 w-4"/>{coords?tr("Change location","مقام تبدیل کریں"):tr("Choose location","مقام منتخب کریں")}</Button>
      {coords&&<p className="text-xs text-primary">GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
      <Input placeholder={tr("Notes (optional)","ہدایات (اختیاری)")} value={notes} onChange={e=>setNotes(e.target.value)}/>
      <Button onClick={submit} disabled={submitting||!files.length||!coords} className="gap-2">{submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}{tr("Send","بھیجیں")}</Button>
    </DialogContent>
  </Dialog><LocationSheet open={locOpen} onOpenChange={setLocOpen} onSelected={loc=>{setAddress(loc.address);setCoords(validListPin(loc.lat,loc.lng)?{lat:Number(loc.lat),lng:Number(loc.lng)}:null);}}/></>;
}
