import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Phone } from "lucide-react";
import { riderPresenceFresh } from "@/lib/riderOperations";

type Rider = { id: string; current_lat: number | null; current_lng: number | null; location_updated_at: string | null; last_seen_at: string | null; is_available: boolean | null; is_suspended: boolean; wallet_balance: number | null; total_earnings: number | null; acceptance_rate: number; capacity_kg: number };
type Row = { id: string; status: string; kind: string; created_at: string; amount?: number; order_id?: string };
export default function RiderDetailsDialog({ rider, name, phone, city, onClose, onPay }: { rider: Rider | null; name: string; phone: string; city: string; onClose: () => void; onPay: (id: string) => void }) {
  const { isAdmin, permissions } = useAuth();
  const finance = isAdmin || permissions.includes("finance");
  const ordersAllowed = isAdmin || permissions.includes("orders");
  const [orders, setOrders] = useState<Row[]>([]);
  const [offers, setOffers] = useState<Row[]>([]);
  const [earnings, setEarnings] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!rider) return;
    let cancelled = false;
    setBusy(true); setError(""); setOrders([]); setOffers([]); setEarnings([]);
    const load = async () => {
      const responses = await Promise.all([
        ...(["orders", "grocery_cart_orders", "grocery_list_orders"] as const).map(table => ordersAllowed ? supabase.from(table).select("id,status,created_at").eq("rider_id", rider.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null })),
        ordersAllowed ? supabase.from("delivery_offers").select("id,status,order_kind,created_at,order_id").eq("rider_id", rider.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
        finance ? supabase.from("rider_earnings").select("id,status,order_kind,created_at,order_id,amount").eq("rider_id", rider.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      setOrders(responses.slice(0, 3).flatMap((r, index) => (r.data || []).map(row => ({ ...row, kind: ["فوڈ", "گروسری", "فوٹو لسٹ"][index] }))).sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setOffers((responses[3].data || []).map(row => ({ ...row, kind: "آفر" })));
      setEarnings((responses[4].data || []).map(row => ({ ...row, kind: "کمائی" })));
      if (responses.some(r => r.error)) setError("کچھ تفصیلات لوڈ نہیں ہوئیں۔");
      setBusy(false);
    };
    void load().catch(() => { if (!cancelled) { setError("تفصیل نہیں کھلی؛ دوبارہ کوشش کریں۔"); setBusy(false); } });
    return () => { cancelled = true; };
  }, [rider?.id, finance, ordersAllowed]);
  const rows = (items: Row[]) => busy ? <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p> : items.length === 0 ? <p className="text-xs text-muted-foreground">کوئی ریکارڈ نہیں</p> : items.map(row => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-xs"><span>{row.kind} · #{(row.order_id || row.id).slice(0, 8)}<span className="block text-muted-foreground">{new Date(row.created_at).toLocaleString("ur-PK-u-nu-latn")}</span></span><span>{row.status}{row.amount !== undefined && <strong className="block">Rs {row.amount}</strong>}</span></div>);
  return <Dialog open={rider !== null} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>{name || "رائیڈر"}</DialogTitle><DialogDescription>{city || "شہر درکار"} · {rider?.id.slice(0, 8)}</DialogDescription></DialogHeader>{rider && <><div className="grid grid-cols-2 gap-3 border-y py-3 text-xs"><div>حالت<strong className="block">{rider.is_suspended ? "معطل" : riderPresenceFresh(rider) ? "تازہ دستیاب" : rider.is_available ? "دستیابی پرانی" : "آف لائن"}</strong></div><div>آخری GPS<strong className="block">{rider.location_updated_at ? new Date(rider.location_updated_at).toLocaleString("ur-PK-u-nu-latn") : "نامعلوم"}</strong></div><div>قبولیت<strong className="block">{rider.acceptance_rate}%</strong></div><div>وزن کی گنجائش<strong className="block">{rider.capacity_kg} kg</strong></div>{finance && <><div>پاس موجود نقد<strong className="block">Rs {rider.wallet_balance || 0}</strong></div><div>کل کمائی<strong className="block">Rs {rider.total_earnings || 0}</strong></div></>}</div><div className="flex flex-wrap gap-2">{phone && <Button variant="outline" size="sm" asChild><a href={`tel:${phone}`}><Phone className="size-4" /> رابطہ</a></Button>}{rider.current_lat !== null && rider.current_lng !== null && <Button variant="outline" size="sm" asChild><a href={`https://www.google.com/maps?q=${rider.current_lat},${rider.current_lng}`} target="_blank" rel="noopener noreferrer"><MapPin className="size-4" /> محفوظ مقام</a></Button>}{finance && <Button size="sm" onClick={() => onPay(rider.id)}>پلان اور ادائیگی</Button>}</div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<Tabs defaultValue={ordersAllowed ? "orders" : "earnings"}><TabsList className="w-full justify-start">{ordersAllowed && <><TabsTrigger value="orders">حالیہ آرڈرز</TabsTrigger><TabsTrigger value="offers">آفرز</TabsTrigger></>}{finance && <TabsTrigger value="earnings">کمائی</TabsTrigger>}</TabsList><TabsContent value="orders">{rows(orders)}</TabsContent><TabsContent value="offers">{rows(offers)}</TabsContent><TabsContent value="earnings">{rows(earnings)}</TabsContent></Tabs></>}</DialogContent></Dialog>;
}