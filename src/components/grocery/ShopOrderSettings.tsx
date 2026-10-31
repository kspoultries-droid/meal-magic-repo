import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LocateFixed, Save } from "lucide-react";
import { toast } from "sonner";

export default function ShopOrderSettings({ store, onChanged }: { store: any; onChanged: () => void }) {
  const [automatic, setAutomatic] = useState(Boolean(store.auto_accept_orders));
  const [mode, setMode] = useState(store.pays_delivery_fee ? "vendor" : store.free_delivery_above ? "threshold" : "customer");
  const [threshold, setThreshold] = useState(String(store.free_delivery_above || ""));
  const [lat, setLat] = useState(String(store.pickup_lat ?? ""));
  const [lng, setLng] = useState(String(store.pickup_lng ?? ""));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (mode === "threshold" && !(Number(threshold) > 0)) return toast.error("خریداری کی مثبت حد درج کریں");
    setBusy(true);
    const { error } = await supabase.rpc("save_shop_order_settings", { _store_id: store.id, _auto_accept: automatic, _pays_delivery: mode === "vendor", _free_above: mode === "threshold" ? Number(threshold) : null, _lat: lat.trim() ? Number(lat) : null, _lng: lng.trim() ? Number(lng) : null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("دکان کی ترتیبات محفوظ ہو گئیں");
    onChanged();
  };
  return <section className="space-y-5 py-4">
    <h2 className="font-bold">آرڈر اور ڈیلیوری / Orders & delivery</h2>
    <div className="flex items-center justify-between gap-4 border-b pb-4"><label htmlFor="shop-auto" className="text-sm font-bold">اسٹاک والے آرڈر خود قبول / Auto accept</label><Switch id="shop-auto" checked={automatic} onCheckedChange={setAutomatic} /></div>
    <div className="space-y-2"><label className="text-sm font-bold">مقامی بائیک ڈیلیوری کی فیس</label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">گاہک ادا کرے / Customer pays</SelectItem><SelectItem value="vendor">دکان ادا کرے / Shop pays</SelectItem><SelectItem value="threshold">خریداری کی حد سے اوپر مفت / Above amount</SelectItem></SelectContent></Select>
    {mode === "threshold" && <Input aria-label="مفت ڈیلیوری کی حد" type="number" min="1" placeholder="خریداری کی حد (Rs)" value={threshold} onChange={e => setThreshold(e.target.value)} />}
    {mode !== "customer" && <p className="text-xs text-muted-foreground">رائیڈر کا اصل کرایہ دکان کے حساب سے کٹے گا؛ کورئیر اور بڑی گاڑی شامل نہیں۔</p>}</div>
    <div className="space-y-2"><h3 className="text-sm font-bold">دکان کا مقام / Pickup location</h3><div className="grid grid-cols-2 gap-2"><Input aria-label="دکان عرض بلد" placeholder="Latitude" type="number" value={lat} onChange={e => setLat(e.target.value)} /><Input aria-label="دکان طول بلد" placeholder="Longitude" type="number" value={lng} onChange={e => setLng(e.target.value)} /></div><Button variant="outline" onClick={() => navigator.geolocation?.getCurrentPosition(p => { setLat(String(p.coords.latitude)); setLng(String(p.coords.longitude)); }, () => toast.error("مقام کی اجازت دیں"))}><LocateFixed className="me-2 size-4" /> یہاں دکان کا مقام لیں</Button></div>
    <Button disabled={busy} onClick={save}><Save className="me-2 size-4" /> محفوظ کریں / Save</Button>
  </section>;
}