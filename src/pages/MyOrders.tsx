import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Package, Bike, CheckCircle2, XCircle, Clock, ChevronRight, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BottomTabBar from "@/components/BottomTabBar";
export const ORDER_TABS = [
  {key:"all",label:"سب",en:"All",icon:Package},
  {key:"processing",label:"تیاری میں",en:"Processing",icon:Clock},
  {key:"onway",label:"راستے میں",en:"To receive",icon:Bike},
  {key:"delivered",label:"پہنچ گئے",en:"Delivered",icon:CheckCircle2},
  {key:"cancelled",label:"منسوخ",en:"Cancelled",icon:XCircle},
] as const;
export type OrderTab = typeof ORDER_TABS[number]["key"];
export function orderTabOf(status:string,stage?:string): OrderTab {
  if(["cancelled","rejected","returned_to_store"].includes(status)) return "cancelled";
  if(["delivered","completed"].includes(status)) return "delivered";
  if(["assigned","arrived_pickup"].includes(stage || "")) return "processing";
  if(["picked_up","on_the_way","arrived_dropoff"].includes(stage || "") || ["picked_up","delivering","on_the_way","out_for_delivery"].includes(status)) return "onway";
  return "processing";
}
export default function MyOrders() {
  const {user,loading:authLoading}=useAuth(); const {lang,dir,t}=useLanguage();
  const L=(en:string,ur:string)=>lang==="ur"?ur:en;
  const navigate=useNavigate(); const [params,setParams]=useSearchParams();
  const requested=params.get("tab"); const tab=ORDER_TABS.some(t=>t.key===requested)?requested:"all";
  const [orders,setOrders]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
  useEffect(()=>{if(!authLoading&&!user)navigate("/auth");},[user,authLoading,navigate]);
  useEffect(()=>{
    if(!user)return; let alive=true;
    const load=async()=>{
      const results=await Promise.all([
        supabase.from("orders").select("*,order_items(*),restaurants(name,image_url)").eq("customer_id",user.id).order("created_at",{ascending:false}).limit(50),
        supabase.from("grocery_cart_orders").select("*,grocery_stores(name)").eq("customer_id",user.id).order("created_at",{ascending:false}).limit(50),
        supabase.from("grocery_list_orders").select("*,grocery_stores(name)").eq("customer_id",user.id).order("created_at",{ascending:false}).limit(50),
        supabase.from("service_bookings").select("*,services(name,image_url)").eq("customer_id",user.id).order("created_at",{ascending:false}).limit(50),
      ]);
      if(!alive)return;
      setError(results.some(r=>!!r.error));
      setOrders(results.flatMap((r,i)=>(r.data||[]).map(o=>({...o,kind:["food","grocery_cart","grocery_list","service"][i]}))).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)));setLoading(false);
    }; void load();
    const channel=supabase.channel(`account-orders-${user.id}`);
    for(const table of ["orders","grocery_cart_orders","grocery_list_orders","service_bookings"])channel.on("postgres_changes",{event:"*",schema:"public",table,filter:`customer_id=eq.${user.id}`},()=>void load());
    channel.subscribe();return()=>{alive=false;void supabase.removeChannel(channel);};
  },[user?.id]);
  const list=tab==="all"?orders:orders.filter(o=>orderTabOf(o.status,o.delivery_stage)===tab);
  return <div className="account-page min-h-screen pb-24" dir={dir}><header className="sticky top-0 z-40 bg-card border-b"><div className="mx-auto max-w-3xl"><div className="h-14 flex items-center gap-2 px-3"><Button variant="ghost" size="icon" aria-label={L("Back","واپس")} onClick={()=>navigate("/profile")}><ArrowLeft className="h-5 w-5 rtl:rotate-180"/></Button><h1 className="font-bold text-lg">{t("profile.myOrders")}</h1></div><div className="flex overflow-x-auto">{ORDER_TABS.map(tb=><Button key={tb.key} variant="ghost" className={`rounded-none h-11 px-4 shrink-0 text-xs border-b-2 ${tab===tb.key?"border-primary text-primary":"border-transparent text-muted-foreground"}`} onClick={()=>setParams({tab:tb.key},{replace:true})}>{lang==="ur"?tb.label:tb.en}</Button>)}</div></div></header><main className="mx-auto max-w-3xl p-3 space-y-3">{loading?[1,2,3].map(n=><div key={n} className="h-36 rounded-lg bg-muted animate-pulse"/>):<>{error&&<p className="text-sm text-destructive">{L("Some orders could not be loaded. Please refresh.","کچھ آرڈرز نہیں کھل سکے؛ دوبارہ تازہ کریں۔")}</p>}{!list.length&&<div className="text-center py-12"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/><p className="text-sm text-muted-foreground">{L("No orders here yet","ابھی اس حصے میں کوئی آرڈر نہیں")}</p><Button className="mt-4" onClick={()=>navigate("/bazar")}>{L("Start shopping","خریداری شروع کریں")}</Button></div>}{list.map(o=>{const group=orderTabOf(o.status,o.delivery_stage);const tb=ORDER_TABS.find(t=>t.key===group);const lines=o.order_items||o.items||[];const first=Array.isArray(lines)?lines[0]:null;const photo=first?.image||first?.image_url||o.restaurants?.image_url;return <Button key={o.id} variant="ghost" className="w-full h-auto p-0 bg-card border rounded-lg flex-col items-stretch overflow-hidden text-start" onClick={()=>navigate(`/order-tracking/${o.id}`)}><div className="flex items-center justify-between px-3 py-2 border-b"><span className="flex items-center gap-2 text-sm min-w-0"><Store className="h-4 w-4 text-primary shrink-0"/><b className="truncate">{o.restaurants?.name||o.grocery_stores?.name||L("Shop","دکان")}</b></span><span className="text-xs text-primary">{lang==="ur"?tb?.label:tb?.en}</span></div><div className="flex items-center gap-3 p-3"><div className="h-16 w-16 rounded-lg bg-secondary shrink-0 overflow-hidden">{photo?<img src={photo} alt="" loading="lazy" className="h-full w-full object-cover"/>:<Package className="h-7 w-7 text-primary m-4"/>}</div><div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{first?.name||L("Shopping list","خریداری کی فہرست")}</p><p className="text-xs text-muted-foreground mt-1">#{o.id.slice(0,8)} · {new Date(o.created_at).toLocaleDateString("en-GB")}</p><p className="font-bold text-primary mt-1">Rs {Number(o.total_amount||0).toLocaleString("en-US")}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180"/></div><div className="text-xs text-muted-foreground px-3 py-2 border-t flex justify-between"><span>{L("View details & tracking","تفصیل اور ٹریکنگ دیکھیں")}</span><span>{o.kind==="food"?L("Food","کھانا"):L("Grocery / Bazar","گروسری / بازار")}</span></div></Button>})}</>}</main><BottomTabBar/></div>;
}
