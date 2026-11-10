import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/lib/i18n/tr";
import BusinessLocationRequest from "@/components/vendor/BusinessLocationRequest";

export default function ShopOrderSettings({ store, onChanged }: { store: any; onChanged: () => void }) {
  const [mode, setMode] = useState(store.pays_delivery_fee ? "vendor" : store.free_delivery_above ? "threshold" : "customer");
  const [threshold, setThreshold] = useState(String(store.free_delivery_above || ""));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (mode === "threshold" && !(Number(threshold) > 0)) return toast.error(tr("Enter a positive order threshold", "خریداری کی مثبت حد درج کریں"));
    setBusy(true);
    const { error } = await supabase.rpc("save_shop_order_settings", { _store_id: store.id, _auto_accept: false, _pays_delivery: mode === "vendor", _free_above: mode === "threshold" ? Number(threshold) : null, _lat: store.pickup_lat, _lng: store.pickup_lng });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Shop settings saved", "دکان کی ترتیبات محفوظ ہو گئیں"));
    onChanged();
  };
  return <section className="space-y-5 py-4">
    <h2 className="font-bold">{tr("Orders & delivery", "آرڈر اور ڈیلیوری")}</h2>
    <div className="space-y-2"><label className="text-sm font-bold">{tr("Local bike delivery fee", "مقامی بائیک ڈیلیوری کی فیس")}</label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">{tr("Customer pays", "گاہک ادا کرے")}</SelectItem><SelectItem value="vendor">{tr("Shop pays", "دکان ادا کرے")}</SelectItem><SelectItem value="threshold">{tr("Free above order amount", "خریداری کی حد سے اوپر مفت")}</SelectItem></SelectContent></Select>
    {mode === "threshold" && <Input aria-label={tr("Free delivery threshold", "مفت ڈیلیوری کی حد")} type="number" min="1" placeholder={tr("Order threshold (Rs)", "خریداری کی حد (Rs)")} value={threshold} onChange={e => setThreshold(e.target.value)} />}
    {mode !== "customer" && <p className="text-xs text-muted-foreground">{tr("Actual rider fee is deducted from the shop's balance; courier and larger vehicles are excluded.", "رائیڈر کا اصل کرایہ دکان کے حساب سے کٹے گا؛ کورئیر اور بڑی گاڑی شامل نہیں۔")}</p>}</div>
    <div className="space-y-2"><h3 className="text-sm font-bold">{tr("Registered shop location", "دکان کا رجسٹرڈ مقام")}</h3><p className="text-xs text-muted-foreground" dir="ltr">{store.pickup_lat != null && store.pickup_lng != null ? `${Number(store.pickup_lat).toFixed(5)}, ${Number(store.pickup_lng).toFixed(5)}` : tr("Location confirmation required", "مقام کی تصدیق درکار ہے")}</p><BusinessLocationRequest id={store.id} name={store.name} kind="grocery" /></div>
    <Button disabled={busy} onClick={save}><Save className="me-2 size-4" />{tr("Save", "محفوظ کریں")}</Button>
  </section>;
}