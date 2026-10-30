import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, ShoppingBag, Heart, MapPin, ChevronRight, ChevronDown, ChevronUp, Crown, Gift, Ticket, LogOut, User, Pencil, Fingerprint, Wrench, Headphones, Wallet, Copy, Plus, Trash2, Navigation, Star, Store, Bike, Package, RefreshCw, Smartphone } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import OrderReviewDialog from "@/components/orders/OrderReviewDialog";
import CustomerGroceryHistory from "@/components/grocery/CustomerGroceryHistory";
import AccountTile from "@/components/profile/AccountTile";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useCart } from "@/contexts/CartContext";
import { ORDER_TABS, orderTabOf } from "@/pages/MyOrders";
import { Capacitor } from "@capacitor/core";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Camera, Coins, HelpCircle, History, Share2 } from "lucide-react";
import { readRecent } from "@/lib/recentlyViewed";
import rewardsImage from "@/assets/account-rewards.jpg";

const Profile = () => {
  const { user, loading: authLoading, refreshRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, lang, dir } = useLanguage();
  const L = (en: string, ur: string) => lang === "ur" ? ur : en;
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [showCoins, setShowCoins] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const recent = readRecent(user?.id);
  const native = Capacitor.isNativePlatform();
  const installed = native || window.matchMedia("(display-mode: standalone)").matches;
  const { addItems, setIsOpen: setCartOpen } = useCart();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", email: "" });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [newAddr, setNewAddr] = useState({ label: "Home", address: "", lat: null as number | null, lng: null as number | null });
  const [locBusy, setLocBusy] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [partnerAssets, setPartnerAssets] = useState({ restaurants: [] as any[], stores: [] as any[], serviceProvider: null as any, rider: null as any });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const cacheKey = user ? `easylife:profile-cache:${user.id}` : "";
  const applyData = (d: any) => {
    setProfile(d.profile);
    setOrders(d.orders || []);
    setRoles(d.roles || []);
    setPartnerAssets(d.partnerAssets);
    setWalletBalance(Number(d.walletBalance || 0));
    setForm({
      full_name: d.profile?.full_name || "",
      phone: d.profile?.phone || "",
      address: d.profile?.address || "",
      email: user?.email || "",
    });
  };

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Show last-known account data instantly; refresh silently in background.
    let hasCache = false;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && !profile) { applyData(JSON.parse(cached)); hasCache = true; setLoading(false); }
      else if (profile) hasCache = true;
    } catch { /* ignore */ }
    if (!hasCache) setLoading(true);
    try {
      const fallbackProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        phone: "",
        address: "",
      };
      const [
        { data: prof, error: profileError },
        { data: ords },
        { data: userRoles },
        { data: ownedRestaurants },
        { data: ownedStores },
        { data: serviceProvider },
        { data: riderProfile },
        { data: walletData },
        { data: groceryOrders },
        { data: listOrders },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("*, order_items(*), restaurants(name)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("restaurants").select("id,name,is_active").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("grocery_stores").select("id,name,store_type,is_active").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("service_providers").select("id,name,is_available,is_active").eq("user_id", user.id).maybeSingle(),
        supabase.from("riders").select("id,is_available").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("grocery_cart_orders").select("id,status").eq("customer_id", user.id).order("created_at", {ascending:false}).limit(50),
        supabase.from("grocery_list_orders").select("id,status").eq("customer_id", user.id).order("created_at", {ascending:false}).limit(50),
      ]);
      if (profileError) console.error("Profile load error:", profileError);
      const data = {
        profile: prof || fallbackProfile,
        orders: [...(ords || []), ...(groceryOrders || []), ...(listOrders || [])],
        roles: (userRoles || []).map((r: any) => r.role),
        partnerAssets: {
          restaurants: ownedRestaurants || [],
          stores: ownedStores || [],
          serviceProvider: serviceProvider || null,
          rider: riderProfile || null,
        },
        walletBalance: Number((walletData as any)?.balance || 0),
      };
      applyData(data);
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* quota */ }
    } catch (error) {
      console.error("Profile data load error:", error);
      if (!hasCache) toast.error("اکاؤنٹ ڈیٹا لوڈ نہیں ہوا، دوبارہ کوشش کریں۔");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("profile-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const updateProfile = async () => {
    if (!user) return;
    const { email, ...profileFields } = form;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...profileFields }, { onConflict: "id" });
    if (error) { toast.error(error.message); return; }
    if (email && email !== user.email) {
      const { error: eErr } = await supabase.auth.updateUser({ email });
      if (eErr) { toast.error("ای میل: " + eErr.message); }
      else toast.success(L("Email confirmation sent", "ای میل تصدیقی لنک بھیج دیا گیا"));
    }
    toast.success(L("Profile updated", "پروفائل محفوظ ہو گیا"));
    setEditing(false);
    fetchData();
  };

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setAddresses(data || []);
  };

  const openAddresses = () => { setShowAddresses(true); fetchAddresses(); };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const j = await r.json();
          if (j?.display_name) addr = j.display_name;
        } catch {}
        setNewAddr({ ...newAddr, address: addr, lat: latitude, lng: longitude });
        setLocBusy(false);
        toast.success("لوکیشن مل گئی");
      },
      (err) => { setLocBusy(false); toast.error("لوکیشن نہیں ملی: " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveAddress = async () => {
    if (!user) return;
    if (!newAddr.address.trim()) { toast.error(L("Enter an address", "پتہ لکھیں")); return; }
    const isFirst = addresses.length === 0;
    const { error } = await supabase.from("user_addresses").insert({
      user_id: user.id, label: newAddr.label || "Home",
      address: newAddr.address, lat: newAddr.lat, lng: newAddr.lng,
      is_default: isFirst,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(L("Address saved", "پتہ محفوظ ہو گیا"));
    setNewAddr({ label: "Home", address: "", lat: null, lng: null });
    fetchAddresses();
  };

  const deleteAddress = async (id: string) => {
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchAddresses();
  };

  const makeDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("user_addresses").update({ is_default: true }).eq("id", id);
    fetchAddresses();
  };

  useEffect(() => {
    let active = true;
    setPhotoUrl("");
    const path = profile?.avatar_url;
    if (path?.startsWith(`${user?.id}/`)) {
      supabase.storage.from("profile-photos").createSignedUrl(path, 300).then(({data}) => { if(active) setPhotoUrl(data?.signedUrl || ""); });
    } else if (path?.startsWith("https://")) setPhotoUrl(path);
    return () => { active = false; };
  }, [profile?.avatar_url, user?.id]);
  useEffect(() => {
    if (!user) return;
    supabase.rpc("claim_daily_coin").then(({data, error}) => { if (!error && data) setCoinBalance(Number((data as any).balance)); });
  }, [user?.id]);
  const uploadPhoto = async (file?: File) => {
    if (!file || !user) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { toast.error(L("Choose a JPG, PNG or WebP under 5 MB", "5 MB سے چھوٹی JPG، PNG یا WebP تصویر منتخب کریں")); return; }
    setPhotoBusy(true);
    const path = `${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const {error} = await supabase.storage.from("profile-photos").upload(path, file, {upsert:false});
    if (error) { toast.error(error.message); setPhotoBusy(false); return; }
    const saved = await supabase.from("profiles").update({avatar_url:path}).eq("id",user.id);
    if(saved.error) toast.error(saved.error.message);
    else { await fetchData(); toast.success(L("Photo saved", "تصویر محفوظ ہو گئی")); }
    setPhotoBusy(false);
  };
  const registerPasskey = async () => {
    if (native || !browserSupportsWebAuthn() || window.self !== window.top) {
      window.open(`https://easylife.apnahub.online/profile`, "_blank", "noopener,noreferrer");
      return;
    }
    setPasskeyBusy(true);
    try {
      const {data} = await supabase.auth.getSession();
      if (!data.session) throw new Error(L("Sign in first", "پہلے لاگ ان کریں"));
      const call = async (path:string, body:object) => {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/${path}`, {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session?.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}, body:JSON.stringify(body)});
        const json = await res.json(); if(!res.ok || json.error) throw new Error(json.error || "Passkey request failed"); return json;
      };
      const options = await call("register-options",{});
      const credential = await startRegistration({optionsJSON:options});
      await call("register-verify",{credential,deviceName:"My Phone"});
      toast.success(L("Passkey registered", "فنگر پرنٹ رجسٹر ہو گیا"));
    } catch (error:any) { toast.error(error.name === "NotAllowedError" ? L("Registration cancelled", "رجسٹریشن منسوخ ہوئی") : error.message); }
    finally { setPasskeyBusy(false); }
  };
  const dashboards = [
    ...(roles.includes("admin") ? [{name:t("dash.admin"),path:"/admin",icon:Settings}] : []),
    ...(roles.includes("restaurant_owner") ? [{name:t("dash.restaurant"),path:"/restaurant-dashboard",icon:Store}] : []),
    ...(roles.includes("rider") ? [{name:t("dash.rider"),path:"/rider-dashboard",icon:Bike}] : []),
    ...(roles.includes("support") ? [{name:t("dash.support"),path:"/support-dashboard",icon:Headphones}] : []),
    ...(roles.includes("mechanic") || partnerAssets.serviceProvider ? [{name:t("dash.mechanic"),path:"/mechanic-dashboard",icon:Wrench}] : []),
    ...(roles.includes("service_manager") ? [{name:t("dash.serviceManager", L("Service management","سروس انتظام")),path:"/service-manager-dashboard",icon:Wrench}] : []),
    ...partnerAssets.stores.map(store=>({name:store.name,path:`/grocery/${store.id}`,icon:Store})),
  ];
  if (!user || !profile) return <div className="min-h-screen bg-background p-4 space-y-4"><div className="h-36 bg-muted animate-pulse rounded-lg"/><div className="h-28 bg-muted animate-pulse rounded-lg"/></div>;
  const title = profile.full_name || user.email?.split("@")[0] || L("My account", "میرا اکاؤنٹ");
  return <div className="account-page min-h-screen pb-24" dir={dir}>
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b"><div className="mx-auto max-w-3xl h-14 flex items-center justify-between px-4"><h1 className="font-bold text-base">{t("profile.account")}</h1><div className="flex items-center gap-1"><LanguageSwitcher/><Button variant="ghost" size="icon" aria-label={L("Edit profile","پروفائل تبدیل کریں")} onClick={()=>setEditing(true)}><Settings className="h-5 w-5"/></Button></div></div></header>
    <main className="max-w-3xl mx-auto">
      <section className="account-identity px-5 pt-7 pb-6">
        <div className="flex gap-4 items-center">
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void uploadPhoto(e.target.files?.[0])}/>
          <Button variant="ghost" disabled={photoBusy} aria-label={L("Change profile photo","پروفائل تصویر بدلیں")} onClick={()=>photoInput.current?.click()} className="relative shrink-0 h-20 w-20 rounded-full p-0 bg-card ring-4 ring-card shadow-card overflow-visible">
            {photoUrl ? <img src={photoUrl} alt={title} className="h-20 w-20 rounded-full object-cover"/> : <span className="text-3xl font-bold text-primary">{title.charAt(0).toUpperCase()}</span>}
            <span className="absolute bottom-0 end-0 rounded-full bg-primary text-primary-foreground p-1.5 border-2 border-card"><Camera className="h-3.5 w-3.5"/></span>
          </Button>
          <div className="min-w-0 flex-1"><h2 className="text-2xl font-extrabold break-words leading-snug">{title}</h2><Button variant="link" className="h-auto p-0 text-muted-foreground text-xs mt-1" onClick={()=>setEditing(true)}>{t("profile.viewEdit")} <Pencil className="h-3 w-3 ms-1"/></Button><div className="flex gap-3 mt-2 text-xs text-muted-foreground"><span><b className="text-foreground">{orders.length}</b> {t("profile.ordersCount")}</span><span>·</span><span><b className="text-foreground">{coinBalance ?? "—"}</b> {L("Coins","سکے")}</span><Button variant="ghost" size="icon" className="h-5 w-5" aria-label={L("Copy account ID","اکاؤنٹ شناخت کاپی کریں")} onClick={()=>{navigator.clipboard.writeText(user.id);toast.success(L("ID copied","شناخت کاپی ہو گئی"));}}><Copy className="h-3 w-3"/></Button></div></div>
        </div>
      </section>
      <section className="bg-card px-4 pb-5 grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={()=>setShowCoins(true)} className="account-promo h-28 p-3 justify-start gap-2 text-start"><img src={rewardsImage} alt="" width={76} height={76} className="h-16 w-16 rounded-lg object-cover"/><span className="min-w-0"><b className="block text-sm">{L("EasyLife Coins","ایزی لائف سکے")}</b><span className="block text-primary text-xs mt-1">{coinBalance ?? "—"} {L("coins","سکے")}</span><span className="block text-[10px] text-muted-foreground mt-1">{L("Daily check-in","روزانہ حاضری")}</span></span></Button>
        <Button variant="ghost" onClick={()=>{if(profile.referral_code){const text=L(`Download EasyLife. My referral code: ${profile.referral_code}`,`ایزی لائف ڈاؤن لوڈ کریں۔ میرا ریفرل کوڈ: ${profile.referral_code}`);window.open(`https://wa.me/?text=${encodeURIComponent(text+"\nhttps://easylife.apnahub.online/install?ref="+profile.referral_code)}`,"_blank","noopener,noreferrer");}}} className="account-invite h-28 p-3 justify-start gap-3 text-start"><span className="account-art"><Gift className="h-8 w-8"/></span><span className="min-w-0"><b className="block text-sm">{L("Invite friends","دوستوں کو بلائیں")}</b><span className="block text-xs mt-1 text-muted-foreground">{L("Share EasyLife","ایزی لائف شیئر کریں")}</span><Share2 className="h-4 w-4 mt-2 text-primary"/></span></Button>
      </section>
      <section className="account-band px-4 py-4">
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{t("profile.myOrders")}</h3><Button variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={()=>navigate("/my-orders")}>{L("View all","سب دیکھیں")} <ChevronRight className="h-4 w-4 rtl:rotate-180"/></Button></div>
        <div className="grid grid-cols-4 gap-1">{ORDER_TABS.slice(1).map(tb=>{const Icon=tb.icon;const n=orders.filter(o=>orderTabOf(o.status,o.delivery_stage)===tb.key).length;return <Button variant="ghost" key={tb.key} onClick={()=>navigate(`/my-orders?tab=${tb.key}`)} className="h-20 flex-col gap-2 p-1 relative"><Icon className="h-7 w-7 text-primary"/>{n>0&&<span className="absolute top-0 end-3 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5">{n}</span>}<span className="text-[11px] font-medium whitespace-normal leading-snug">{lang==="ur"?tb.label:tb.en}</span></Button>})}</div>
      </section>
      <section className="account-band px-4 py-4"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-lg">{L("Recently viewed","حال ہی میں دیکھی گئی اشیا")}</h3>{recent.length>3&&<Button variant="link" className="text-xs h-auto p-0" onClick={()=>setShowRecent(true)}>{L("View more","مزید دیکھیں")}</Button>}</div>{recent.length ? <div className="flex gap-3 overflow-x-auto pb-1">{recent.slice(0,8).map(item=><Button variant="ghost" key={item.id} onClick={()=>navigate(`/product/${item.id}`)} className="h-auto p-0 flex-col items-start w-28 shrink-0 gap-1.5 text-start"><span className="w-28 h-28 bg-secondary rounded-lg overflow-hidden">{item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-contain"/>:<Package className="h-8 w-8 m-10 text-muted-foreground"/>}</span><span className="text-xs line-clamp-1 w-full">{item.name}</span><b className="text-sm text-primary">Rs {Number(item.wholesale_price??item.discount_price??item.price).toLocaleString("en-US")}</b></Button>)}</div>:<div className="flex items-center gap-3 py-3 text-muted-foreground"><History className="h-7 w-7"/><span className="text-xs">{L("No recently viewed items yet","ابھی کوئی چیز نہیں دیکھی گئی")}</span><Button variant="link" className="ms-auto text-xs" onClick={()=>navigate("/bazar")}>{L("Shop","خریداری")}</Button></div>}</section>
      <section className="account-band px-4 py-4"><h3 className="font-bold text-lg mb-3">{t("profile.wallet")}</h3><Button variant="ghost" className="bg-secondary/60 w-full h-auto py-3 px-4 justify-between" onClick={()=>navigate("/wallet")}><span className="text-start"><span className="text-xs text-muted-foreground block">{L("Available balance","دستیاب بیلنس")}</span><b className="text-xl">Rs {walletBalance.toLocaleString("en-US")}</b></span><span className="text-primary text-xs">{L("View wallet","والیٹ دیکھیں")} <ChevronRight className="inline h-4 w-4 rtl:rotate-180"/></span></Button></section>
      <section className="account-band p-4 grid grid-cols-4 gap-x-2 gap-y-5">{[{label:t("profile.savedAddresses"),icon:MapPin,action:openAddresses},{label:L("Help centre","مدد مرکز"),icon:Headphones,action:()=>navigate("/profile?help=1")},{label:t("profile.review"),icon:Star,action:()=>navigate("/my-orders?tab=delivered")},{label:t("profile.becomePartner"),icon:Store,action:()=>navigate("/partner")},{label:L("Grocery","گروسری"),icon:ShoppingBag,action:()=>navigate("/grocery")},{label:L("Bazar","بازار"),icon:Package,action:()=>navigate("/bazar")},{label:L("Services","سروسز"),icon:Wrench,action:()=>navigate("/services")},{label:L("Account settings","اکاؤنٹ ترتیبات"),icon:Settings,action:()=>setEditing(true)}].map((tile,i)=><Button key={tile.label} variant="ghost" onClick={tile.action} className="h-auto flex-col p-0 gap-2"><span className={`account-art account-art-${i%4}`}><tile.icon className="h-6 w-6"/></span><span className="text-[11px] leading-snug whitespace-normal text-center">{tile.label}</span></Button>)}</section>
      {dashboards.length>0&&<section className="account-band p-4"><div className="flex justify-between mb-2"><h3 className="font-bold">{t("profile.workDashboard")}</h3><Button variant="ghost" size="icon" aria-label={t("profile.refresh")} onClick={async()=>{await refreshRoles();await fetchData();}}><RefreshCw className="h-4 w-4"/></Button></div>{dashboards.map((d,i)=><Button key={i} variant="ghost" className="w-full h-12 justify-start gap-3 border-b last:border-0" onClick={()=>navigate(d.path)}><d.icon className="h-5 w-5 text-primary"/><span className="truncate">{d.name}</span><ChevronRight className="h-4 w-4 ms-auto rtl:rotate-180"/></Button>)}</section>}
      <section className="account-band p-4"><h3 className="font-bold mb-3">{t("profile.security")}</h3><Button variant="ghost" disabled={passkeyBusy} onClick={registerPasskey} className="w-full h-auto py-3 justify-start gap-3 text-start"><Fingerprint className="h-6 w-6 text-primary shrink-0"/><span className="flex-1 whitespace-normal"><b className="block text-sm">{native?L("Passkey in browser","براؤزر میں فنگر پرنٹ"):t("profile.registerFingerprint")}</b><span className="block text-xs text-muted-foreground mt-1">{native?L("APK passkeys are not supported yet","APK میں فنگر پرنٹ کی سہولت ابھی دستیاب نہیں"):t("profile.fingerprintSub")}</span></span><ChevronRight className="h-4 w-4 rtl:rotate-180"/></Button>{!installed&&<Button variant="ghost" className="w-full justify-start gap-3" onClick={()=>navigate("/install")}><Smartphone className="h-5 w-5 text-primary"/>{L("Install app","ایپ انسٹال کریں")}</Button>}</section>
      <div className="p-4"><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full text-destructive"><LogOut className="h-4 w-4 me-2"/>{t("profile.logout")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("profile.logoutQ")}</AlertDialogTitle><AlertDialogDescription>{t("profile.logoutConfirm")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("profile.cancel")}</AlertDialogCancel><AlertDialogAction onClick={async()=>{localStorage.removeItem(cacheKey);await signOut();navigate("/");}}>{t("profile.yesLogout")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
    </main>
    <Dialog open={editing} onOpenChange={setEditing}><DialogContent><DialogHeader><DialogTitle>{t("profile.viewEdit")}</DialogTitle></DialogHeader><div className="space-y-3"><Input aria-label={t("profile.fullName")} placeholder={t("profile.fullName")} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><Input placeholder={t("profile.phone")} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><Input type="email" placeholder={t("profile.email")} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Input placeholder={t("profile.address")} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><p className="text-xs text-muted-foreground">{t("profile.emailNote")}</p><Button className="w-full" onClick={updateProfile}>{t("profile.save")}</Button></div></DialogContent></Dialog>
    <Dialog open={showAddresses} onOpenChange={setShowAddresses}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>{t("profile.savedAddresses")}</DialogTitle></DialogHeader>{addresses.map(a=><div key={a.id} className="border-b py-2"><div className="flex items-center justify-between"><b className="text-sm">{a.label}</b><div>{!a.is_default&&<Button variant="ghost" size="icon" aria-label={t("profile.default")} onClick={()=>makeDefault(a.id)}><Star className="h-4 w-4"/></Button>}<Button variant="ghost" size="icon" aria-label={L("Delete address","پتہ حذف کریں")} onClick={()=>deleteAddress(a.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></div><p className="text-xs text-muted-foreground">{a.address}</p></div>)}<Input placeholder={L("Label (Home / Office)","نام (گھر / دفتر)")} value={newAddr.label} onChange={e=>setNewAddr({...newAddr,label:e.target.value})}/><Input placeholder={t("profile.fullAddress")} value={newAddr.address} onChange={e=>setNewAddr({...newAddr,address:e.target.value})}/><Button variant="outline" disabled={locBusy} onClick={useMyLocation}>{t("profile.useLocation")}</Button><Button onClick={saveAddress}>{t("profile.save")}</Button></DialogContent></Dialog>
    <Dialog open={showCoins} onOpenChange={setShowCoins}><DialogContent><DialogHeader><DialogTitle>{L("EasyLife Coins","ایزی لائف سکے")}</DialogTitle></DialogHeader><img src={rewardsImage} alt="" className="h-32 w-32 mx-auto rounded-lg"/><p className="text-3xl font-bold text-center text-primary">{coinBalance ?? "—"}</p><p className="text-sm text-center">{L("1 coin per daily account visit. Today's visit is recorded automatically.","روزانہ اکاؤنٹ کھولنے پر 1 سکہ۔ آج کی حاضری خودکار محفوظ ہو جاتی ہے۔")}</p><p className="text-xs text-muted-foreground text-center">{L("Coins are not cash. Redemption is not available yet.","سکے نقد رقم نہیں؛ انہیں خرچ کرنے کی سہولت ابھی دستیاب نہیں۔")}</p></DialogContent></Dialog>
    <Dialog open={showRecent} onOpenChange={setShowRecent}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>{L("Recently viewed","حال ہی میں دیکھی گئی اشیا")}</DialogTitle></DialogHeader>{recent.map(item=><Button key={item.id} variant="ghost" className="justify-start" onClick={()=>navigate(`/product/${item.id}`)}>{item.name}</Button>)}</DialogContent></Dialog>
    <BottomTabBar/>
  </div>;
};
export default Profile;
