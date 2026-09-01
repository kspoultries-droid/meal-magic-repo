import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Truck } from "lucide-react";

interface Vehicle { id: string; code: string; name: string; name_ur: string | null; capacity_kg: number }
interface RateCard {
  id: string; city_id: string | null; mode: string; vehicle_type_id: string | null; label: string;
  base_fee: number; per_km: number; free_km: number; min_fee: number; max_fee: number | null;
  free_above_amount: number | null; max_weight_kg: number | null; sort_order: number;
}
interface Route {
  id: string; from_city_id: string; to_name: string; distance_km: number;
  vehicle_type_id: string | null; flat_fee: number; per_kg_fee: number; is_active: boolean;
}

const MODES = [
  { value: "rider", label: "مقامی رائیڈر (بائیک)" },
  { value: "loader", label: "لوڈر / رکشہ / پک اپ" },
  { value: "intercity", label: "انٹرسٹی کیریج" },
  { value: "courier", label: "کورئیر" },
];

const emptyCard = { label: "", mode: "rider", city_id: "", vehicle_type_id: "", base_fee: "", per_km: "", free_km: "0", min_fee: "0", max_weight_kg: "" };
const emptyRoute = { from_city_id: "", to_name: "", distance_km: "", vehicle_type_id: "", flat_fee: "", per_kg_fee: "0" };

const DeliveryRatesTab = () => {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cards, setCards] = useState<RateCard[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCard, setNewCard] = useState(emptyCard);
  const [newRoute, setNewRoute] = useState(emptyRoute);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cityRows }, { data: vehicleRows }, { data: cardRows }, { data: routeRows }] = await Promise.all([
      supabase.from("cities").select("id, name").order("name"),
      (supabase.from("vehicle_types" as any).select("*").order("sort_order") as any),
      (supabase.from("delivery_rate_cards" as any).select("*").order("mode").order("sort_order") as any),
      (supabase.from("intercity_routes" as any).select("*").order("to_name") as any),
    ]);
    setCities(cityRows || []);
    setVehicles((vehicleRows as Vehicle[]) || []);
    setCards((cardRows as RateCard[]) || []);
    setRoutes((routeRows as Route[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const cityName = (id: string | null) => (id ? cities.find((c) => c.id === id)?.name || "—" : "تمام شہر");
  const vehicleName = (id: string | null) => vehicles.find((v) => v.id === id)?.name_ur || vehicles.find((v) => v.id === id)?.name || "—";

  const patchCard = async (id: string, values: Record<string, unknown>) => {
    setCards((rows) => rows.map((row) => (row.id === id ? { ...row, ...values } as RateCard : row)));
    const { error } = await (supabase.from("delivery_rate_cards" as any).update(values as any).eq("id", id) as any);
    if (error) { toast.error(error.message); fetchAll(); return; }
    toast.success("کرایہ اپڈیٹ ہو گیا ✅");
  };

  const addCard = async () => {
    if (!newCard.label.trim()) { toast.error("کرایہ کارڈ کا نام درکار ہے"); return; }
    const payload = {
      label: newCard.label.trim(), mode: newCard.mode,
      city_id: newCard.city_id || null, vehicle_type_id: newCard.vehicle_type_id || null,
      base_fee: Number(newCard.base_fee) || 0, per_km: Number(newCard.per_km) || 0,
      free_km: Number(newCard.free_km) || 0, min_fee: Number(newCard.min_fee) || 0,
      max_weight_kg: newCard.max_weight_kg ? Number(newCard.max_weight_kg) : null,
    };
    const { error } = await (supabase.from("delivery_rate_cards" as any).insert(payload as any) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("نیا کرایہ کارڈ شامل ہو گیا");
    setNewCard(emptyCard);
    fetchAll();
  };

  const removeCard = async (id: string) => {
    if (!window.confirm("یہ کرایہ کارڈ حذف کریں؟")) return;
    const { error } = await (supabase.from("delivery_rate_cards" as any).delete().eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("کارڈ حذف ہو گیا");
    fetchAll();
  };

  const addRoute = async () => {
    if (!newRoute.from_city_id || !newRoute.to_name.trim()) { toast.error("شہر اور منزل درکار ہے"); return; }
    const payload = {
      from_city_id: newRoute.from_city_id, to_name: newRoute.to_name.trim(),
      distance_km: Number(newRoute.distance_km) || 0, vehicle_type_id: newRoute.vehicle_type_id || null,
      flat_fee: Number(newRoute.flat_fee) || 0, per_kg_fee: Number(newRoute.per_kg_fee) || 0,
    };
    const { error } = await (supabase.from("intercity_routes" as any).insert(payload as any) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("نیا روٹ شامل ہو گیا");
    setNewRoute(emptyRoute);
    fetchAll();
  };

  const patchRoute = async (id: string, values: Record<string, unknown>) => {
    setRoutes((rows) => rows.map((row) => (row.id === id ? { ...row, ...values } as Route : row)));
    const { error } = await (supabase.from("intercity_routes" as any).update(values as any).eq("id", id) as any);
    if (error) { toast.error(error.message); fetchAll(); return; }
    toast.success("روٹ اپڈیٹ ہو گیا ✅");
  };

  const removeRoute = async (id: string) => {
    if (!window.confirm("یہ روٹ حذف کریں؟")) return;
    const { error } = await (supabase.from("intercity_routes" as any).delete().eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("روٹ حذف ہو گیا");
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> ڈلیوری کرایہ کارڈز</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground">
            کرایہ = بیس فیس + (فاصلہ − مفت کلومیٹر) × فی کلومیٹر + وزن کی سلیب۔ آرڈر کے وزن کے مطابق سب سے چھوٹی مناسب گاڑی خود منتخب ہوتی ہے۔
            شہر خالی چھوڑیں تو یہ کارڈ ہر شہر پر لاگو ہو گا۔
          </p>

          <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-4">
            <Input placeholder="نام — مثلاً لوڈر رکشہ" value={newCard.label} onChange={(e) => setNewCard({ ...newCard, label: e.target.value })} />
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={newCard.mode} onChange={(e) => setNewCard({ ...newCard, mode: e.target.value })}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={newCard.city_id} onChange={(e) => setNewCard({ ...newCard, city_id: e.target.value })}>
              <option value="">تمام شہر</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={newCard.vehicle_type_id} onChange={(e) => setNewCard({ ...newCard, vehicle_type_id: e.target.value })}>
              <option value="">گاڑی منتخب کریں</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_ur || v.name} — {v.capacity_kg} کلو</option>)}
            </select>
            <Input type="number" placeholder="بیس فیس" value={newCard.base_fee} onChange={(e) => setNewCard({ ...newCard, base_fee: e.target.value })} />
            <Input type="number" placeholder="فی کلومیٹر" value={newCard.per_km} onChange={(e) => setNewCard({ ...newCard, per_km: e.target.value })} />
            <Input type="number" placeholder="مفت کلومیٹر" value={newCard.free_km} onChange={(e) => setNewCard({ ...newCard, free_km: e.target.value })} />
            <Input type="number" placeholder="زیادہ سے زیادہ وزن (کلو)" value={newCard.max_weight_kg} onChange={(e) => setNewCard({ ...newCard, max_weight_kg: e.target.value })} />
            <Button onClick={addCard} className="sm:col-span-4"><Plus className="me-1 h-4 w-4" /> کرایہ کارڈ شامل کریں</Button>
          </div>

          {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : cards.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">کوئی کرایہ کارڈ نہیں</p>
          ) : cards.map((card) => (
            <div key={card.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold">{card.label}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{MODES.find((m) => m.value === card.mode)?.label || card.mode}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{cityName(card.city_id)}</Badge>
                  <Badge variant="outline" className="text-[10px]">🚚 {vehicleName(card.vehicle_type_id)}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => removeCard(card.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {([
                  ["base_fee", "بیس فیس"],
                  ["per_km", "فی کلومیٹر"],
                  ["free_km", "مفت کلومیٹر"],
                  ["min_fee", "کم از کم فیس"],
                  ["max_weight_kg", "زیادہ وزن (کلو)"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[11px] font-bold text-muted-foreground">{label}</label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      defaultValue={String((card as any)[key] ?? "")}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const value = raw === "" ? null : Number(raw);
                        if (value !== (card as any)[key]) patchCard(card.id, { [key]: value });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>انٹرسٹی روٹس — دوسرے شہر/قصبے کی کیریج</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-3">
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={newRoute.from_city_id} onChange={(e) => setNewRoute({ ...newRoute, from_city_id: e.target.value })}>
              <option value="">کہاں سے</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder="منزل — مثلاً کوٹ سماباں" value={newRoute.to_name} onChange={(e) => setNewRoute({ ...newRoute, to_name: e.target.value })} />
            <Input type="number" placeholder="فاصلہ (کلومیٹر)" value={newRoute.distance_km} onChange={(e) => setNewRoute({ ...newRoute, distance_km: e.target.value })} />
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={newRoute.vehicle_type_id} onChange={(e) => setNewRoute({ ...newRoute, vehicle_type_id: e.target.value })}>
              <option value="">گاڑی</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_ur || v.name}</option>)}
            </select>
            <Input type="number" placeholder="فلیٹ کرایہ" value={newRoute.flat_fee} onChange={(e) => setNewRoute({ ...newRoute, flat_fee: e.target.value })} />
            <Input type="number" placeholder="فی کلو اضافی" value={newRoute.per_kg_fee} onChange={(e) => setNewRoute({ ...newRoute, per_kg_fee: e.target.value })} />
            <Button onClick={addRoute} className="sm:col-span-3"><Plus className="me-1 h-4 w-4" /> روٹ شامل کریں</Button>
          </div>

          {routes.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">کوئی روٹ نہیں</p>
          ) : routes.map((route) => (
            <div key={route.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold">{cityName(route.from_city_id)} ← {route.to_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">🚚 {vehicleName(route.vehicle_type_id)}</Badge>
                  <Switch checked={route.is_active} onCheckedChange={(v) => patchRoute(route.id, { is_active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => removeRoute(route.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["distance_km", "فاصلہ (کلومیٹر)"],
                  ["flat_fee", "فلیٹ کرایہ"],
                  ["per_kg_fee", "فی کلو اضافی"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[11px] font-bold text-muted-foreground">{label}</label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      defaultValue={String((route as any)[key] ?? 0)}
                      onBlur={(e) => {
                        const value = Number(e.target.value) || 0;
                        if (value !== (route as any)[key]) patchRoute(route.id, { [key]: value });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryRatesTab;
