import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, ShoppingBag, Bike, Store, ShoppingCart, Package, Wrench,
  Users, AlertCircle, TrendingUp, MapPin, Phone, RefreshCw, BookOpen
} from "lucide-react";

const Operations = () => {
  const { user, isAdmin, isSupport, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    ordersToday: 0, groceryToday: 0, wholesaleToday: 0, servicesToday: 0,
    pending: 0, activeRiders: 0, revenue: 0, newApps: 0,
  });
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || (!isAdmin && !isSupport))) navigate("/auth");
  }, [user, isAdmin, isSupport, loading, navigate]);

  const loadAll = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();

    const sb: any = supabase;
    const results: any[] = await Promise.all([
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", iso),
      sb.from("grocery_cart_orders").select("id", { count: "exact", head: true }).gte("created_at", iso),
      sb.from("service_bookings").select("id", { count: "exact", head: true }).gte("created_at", iso),
      sb.from("orders").select("id,total_amount,status,delivery_address,created_at,restaurant_id,rider_id,customer_id,restaurants(name)")
        .not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(30),
      sb.from("riders").select("id,full_name,phone,is_online,city_id").eq("is_online", true),
      sb.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("orders").select("total_amount").gte("created_at", iso).eq("status", "delivered"),
    ]);
    const ordersToday = results[0].count;
    const groceryToday = results[1].count;
    const servicesToday = results[2].count;
    const openOrders = results[3].data;
    const activeRiders = results[4].data;
    const newApps = results[5].count;
    const allOrders = results[6].data;

    const revenue = (allOrders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    setStats({
      ordersToday: ordersToday || 0,
      groceryToday: groceryToday || 0,
      wholesaleToday: 0,
      servicesToday: servicesToday || 0,
      pending: (openOrders || []).length,
      activeRiders: (activeRiders || []).length,
      revenue,
      newApps: newApps || 0,
    });
    setLiveOrders(openOrders || []);
    setRiders(activeRiders || []);

    // Alert: orders stuck > 30 min without rider
    const stuck = (openOrders || []).filter((o: any) => {
      const age = (Date.now() - new Date(o.created_at).getTime()) / 60000;
      return age > 30 && !o.rider_id;
    });
    setAlerts(stuck);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const ch = supabase.channel("ops-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadAll)
      .subscribe();
    const interval = window.setInterval(loadAll, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">لوڈ ہو رہا ہے...</div>;
  if (!isAdmin && !isSupport) return null;

  const statusColor = (s: string) => {
    if (s === "pending") return "bg-amber-500";
    if (s === "confirmed") return "bg-blue-500";
    if (s === "preparing") return "bg-purple-500";
    if (s === "delivering") return "bg-cyan-500";
    return "bg-slate-500";
  };

  const ageMin = (t: string) => Math.floor((Date.now() - new Date(t).getTime()) / 60000);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur px-4 md:px-6 py-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-primary">🎛️ آپریشنز کمانڈ سینٹر</h1>
            <p className="text-xs text-muted-foreground">Operations Command Center</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4" /></Button>
      </header>

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ShoppingBag} label="آج کے آرڈرز" value={stats.ordersToday} color="from-orange-500 to-red-500" />
          <StatCard icon={ShoppingCart} label="گروسری آج" value={stats.groceryToday} color="from-green-500 to-emerald-600" />
          <StatCard icon={Wrench} label="سروسز آج" value={stats.servicesToday} color="from-blue-500 to-indigo-600" />
          <StatCard icon={TrendingUp} label="آمدنی (Rs)" value={stats.revenue.toLocaleString()} color="from-purple-500 to-pink-500" />
          <StatCard icon={AlertCircle} label="زیر عمل" value={stats.pending} color="from-amber-500 to-orange-500" />
          <StatCard icon={Bike} label="فعال رائیڈرز" value={stats.activeRiders} color="from-cyan-500 to-blue-500" />
          <StatCard icon={Users} label="نئی درخواستیں" value={stats.newApps} color="from-fuchsia-500 to-purple-500"
            onClick={() => navigate("/admin")} />
          <StatCard icon={AlertCircle} label="اہم Alerts" value={alerts.length} color="from-red-500 to-rose-600" />
        </div>

        {/* Alerts strip */}
        {alerts.length > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {alerts.length} آرڈر 30 منٹ سے زیادہ سے پھنسے ہیں — فوری رائیڈر assign کریں
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <Tabs defaultValue="orders">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="orders">🔴 Live آرڈرز</TabsTrigger>
            <TabsTrigger value="riders">🏍️ رائیڈرز</TabsTrigger>
            <TabsTrigger value="guide"><BookOpen className="w-4 h-4 mr-1" /> گائیڈ</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-3 mt-4">
            {liveOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">اس وقت کوئی زیر عمل آرڈر نہیں</p>
            ) : liveOrders.map((o: any) => (
              <Card key={o.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={statusColor(o.status)}>{o.status}</Badge>
                        <span className="text-xs text-muted-foreground">{ageMin(o.created_at)} منٹ پہلے</span>
                        {!o.rider_id && ageMin(o.created_at) > 20 && (
                          <Badge variant="destructive" className="text-[10px]">رائیڈر نہیں</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm">{o.restaurants?.name || "—"} → {o.profiles?.full_name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {o.delivery_address}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-bold text-primary">Rs {o.total_amount}</span>
                        {o.profiles?.phone && (
                          <a href={`tel:${o.profiles.phone}`} className="flex items-center gap-1 text-primary">
                            <Phone className="w-3 h-3" /> {o.profiles.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate("/admin")}>Manage</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="riders" className="space-y-2 mt-4">
            {riders.length === 0 ? <p className="text-muted-foreground text-center py-8">کوئی رائیڈر آن لائن نہیں</p> :
             riders.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">🟢 Online</Badge>
                    <a href={`tel:${r.phone}`}><Button size="sm" variant="outline"><Phone className="w-3 h-3" /></Button></a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="guide" className="mt-4">
            <Card>
              <CardHeader><CardTitle>📖 آپ کیسے پورا سسٹم چلائیں</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="1">
                    <AccordionTrigger>1️⃣ روزانہ کا معمول</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>• صبح <b>/operations</b> کھولیں — دن بھر یہی صفحہ کھلا رکھیں</p>
                      <p>• سب سے پہلے <b>نئی درخواستیں</b> چیک کریں (اوپر counter)</p>
                      <p>• Live آرڈرز feed پر نظر رکھیں — کوئی 30 منٹ سے پھنسا ہو تو Alert آ جائے گا</p>
                      <p>• رائیڈر کم ہوں تو WhatsApp پر broadcast بھیجیں</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="2">
                    <AccordionTrigger>2️⃣ نئے پارٹنر (شاپ / رائیڈر) کیسے جوائن ہوں گے</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>• پارٹنر <b>/partner</b> صفحہ کھولے (Footer میں link ہے)</p>
                      <p>• 5 categories میں سے اپنی category چنے: ریسٹورنٹ، گروسری، ہول سیل، سروس، رائیڈر</p>
                      <p>• فارم بھر کے submit کرے — پہلے اکاؤنٹ بنانا ہوگا</p>
                      <p>• آپ کے Admin Dashboard کے <b>"پارٹنر درخواستیں"</b> tab میں آ جائے گی</p>
                      <p>• آپ Approve کریں گے — automatically role مل جائے گا اور وہ اپنا Dashboard access کر سکے گا</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="3">
                    <AccordionTrigger>3️⃣ Local Food / Grocery delivery کیسے چلے گی</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p><b>مرحلہ 1:</b> کسٹمر آرڈر کرے → ریسٹورنٹ کے Dashboard میں آ جائے</p>
                      <p><b>مرحلہ 2:</b> ریسٹورنٹ Confirm → Preparing کرے (buttons highlighted نظر آئیں گے)</p>
                      <p><b>مرحلہ 3:</b> آپ (Admin) اس آرڈر کو دیکھیں یہاں Live Feed میں</p>
                      <p><b>مرحلہ 4:</b> Admin Dashboard سے قریب ترین رائیڈر assign کریں (Haversine formula 5 قریبی رائیڈر دکھاتا ہے)</p>
                      <p><b>مرحلہ 5:</b> رائیڈر Pickup → Delivered mark کرے — کسٹمر کو Realtime updates ملیں</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="4">
                    <AccordionTrigger>4️⃣ Wholesale (کراچی صدر) کیسے چلے گی</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p><b>Local Karachi:</b> اپنے رائیڈر sameday deliver کریں</p>
                      <p><b>Nationwide:</b> Vendor کو courier (TCS/Leopards/M&P) بک کرنا ہو گا۔ Vendor Dashboard میں tracking number ڈالے</p>
                      <p>Vendor کو Wholesale category assign کریں اور Bazar page میں نظر آئے گا</p>
                      <p>Vendors 3 بڑی مارکیٹوں سے آ سکتے ہیں: کراچی صدر (2), لاہور شاہ عالمی (1), فیصل آباد کارخانہ (1)</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="5">
                    <AccordionTrigger>5️⃣ Cities / Areas کیسے manage ہوں گے</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>• Admin → Cities tab میں نئے شہر اور delivery fees set کریں</p>
                      <p>• ہر شہر کا اپنا رائیڈر pool ہوگا (رائیڈر signup پر شہر چنے گا)</p>
                      <p>• کسٹمر order کرتے وقت اپنا شہر منتخب کرتا ہے — صرف اسی شہر کی shops دکھتی ہیں</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="6">
                    <AccordionTrigger>6️⃣ کتنے users سنبھال سکتی ہے یہ ایپ</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>• آرام سے: <b>50,000 registered users, 5,000 daily active, 500 concurrent, 2000-3000 آرڈرز روز</b></p>
                      <p>• زیادہ سے زیادہ (upgrade کی ضرورت): 200,000 users, 15,000 DAU, 10,000 orders/day</p>
                      <p>• رحیم یار خان + کراچی launch کے لیے <b>بالکل کافی ہے</b></p>
                      <p>• جب آپ limits کے قریب پہنچیں گے، Cloud compute upgrade + realtime optimization آسانی سے ہو جائیں گے</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="7">
                    <AccordionTrigger>7️⃣ آپ کی ٹیم / سپورٹ staff کیسے help کرے گا</AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p>• کسی کو <b>Support</b> role دیں (Admin → Users tab سے)</p>
                      <p>• وہ /operations page دیکھ سکے گا مگر critical actions (approve/delete) صرف Admin کر سکتا ہے</p>
                      <p>• کسٹمر complaints WhatsApp helpline پر آئیں گے — Live feed سے متعلقہ آرڈر تلاش کریں</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, onClick }: any) => (
  <Card className={`overflow-hidden cursor-${onClick ? "pointer" : "default"}`} onClick={onClick}>
    <CardContent className="p-3">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </CardContent>
  </Card>
);

export default Operations;
