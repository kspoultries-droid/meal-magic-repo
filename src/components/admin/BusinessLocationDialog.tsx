import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n/tr";

export default function BusinessLocationDialog({ business, kind, onChanged }: { business: any; kind: "restaurant" | "grocery" | "service_provider"; onChanged: () => void }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCity(business.city_id || ""); setLat(String(business.pickup_lat ?? business.latitude ?? "")); setLng(String(business.pickup_lng ?? business.longitude ?? "")); setAddress(business.pickup_address || business.address || ""); setReason("");
    void supabase.from("cities").select("id,name").order("name").then(({ data }) => setCities(data || []));
  }, [open, business.id]);
  if (!isAdmin) return null;
  const save = async () => {
    if (!city || !lat.trim() || !lng.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || reason.trim().length < 3) return toast.error(tr("Choose city, pin and relocation reason", "شہر، درست مقام اور تبدیلی کی وجہ درج کریں"));
    setBusy(true);
    const { error } = await supabase.rpc("admin_relocate_business", { _kind: kind, _id: business.id, _city_id: city, _lat: Number(lat), _lng: Number(lng), _address: address, _reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Business location saved", "کاروبار کا مقام محفوظ ہو گیا")); setOpen(false); onChanged();
  };
  return <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}><DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs"><MapPin className="me-1 size-3" />{tr("Location", "مقام")}</Button></DialogTrigger><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{tr("Business location", "کاروبار کا مقام")} — {business.name}</DialogTitle></DialogHeader><Select value={city} onValueChange={setCity}><SelectTrigger aria-label={tr("City", "شہر")}><SelectValue placeholder={tr("City", "شہر")} /></SelectTrigger><SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-2"><Input aria-label={tr("Latitude", "عرض بلد")} placeholder="Latitude" type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} /><Input aria-label={tr("Longitude", "طول بلد")} placeholder="Longitude" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} /></div><Button variant="outline" onClick={() => navigator.geolocation?.getCurrentPosition(p => { setLat(String(p.coords.latitude)); setLng(String(p.coords.longitude)); }, () => toast.error(tr("Location permission required", "مقام کی اجازت درکار ہے")))}><LocateFixed className="me-2 size-4" />{tr("Use current location", "یہاں کا مقام لیں")}</Button>{kind !== "grocery" && <Input aria-label={tr("Business address", "کاروبار کا پتہ")} placeholder={tr("Full business address", "کاروبار کا مکمل پتہ")} value={address} onChange={e => setAddress(e.target.value)} />}<Input aria-label={tr("Relocation reason", "مقام بدلنے کی وجہ")} placeholder={tr("Reason for changing location", "مقام بدلنے کی وجہ")} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /><Button disabled={busy} onClick={() => void save()}>{tr("Save location", "مقام محفوظ کریں")}</Button></DialogContent></Dialog>;
}