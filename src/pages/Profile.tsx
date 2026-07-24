import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, ShoppingBag, Heart, MapPin, ChevronRight, ChevronDown, ChevronUp, Crown, Gift, Ticket, LogOut, User, Pencil, Fingerprint, Wrench, Headphones, Wallet, Copy } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fallbackProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        phone: "",
        address: "",
      };
      const [{ data: prof, error: profileError }, { data: ords }, { data: userRoles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("*, order_items(*)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (profileError) console.error("Profile load error:", profileError);
      const nextProfile = prof || fallbackProfile;
      setProfile(nextProfile);
      setOrders(ords || []);
      setRoles((userRoles || []).map((r: any) => r.role));
      setForm({
        full_name: nextProfile.full_name || "",
        phone: nextProfile.phone || "",
        address: nextProfile.address || "",
      });
    } catch (error) {
      console.error("Profile data load error:", error);
      toast.error("اکاؤنٹ ڈیٹا لوڈ نہیں ہوا، دوبارہ کوشش کریں۔");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("profile-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form }, { onConflict: "id" });
    if (error) { toast.error(error.message); return; }
    toast.success("پروفائل اپڈیٹ ہو گیا!");
    setEditing(false);
    fetchData();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", preparing: "bg-accent text-accent-foreground", delivering: "bg-primary text-primary-foreground", delivered: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  const statusLabel: Record<string, string> = { pending: "زیر التواء", confirmed: "تصدیق شدہ", preparing: "تیاری جاری", delivering: "ڈلیوری جاری", delivered: "مکمل ✅", cancelled: "منسوخ ❌" };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <CartDrawer />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-foreground">Account</h1>
        <button className="p-2 rounded-full hover:bg-secondary">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Profile Hero — Premium gradient card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 px-4 pt-6 pb-8">
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-md ring-2 ring-primary-foreground/30 flex items-center justify-center shadow-xl">
            <span className="text-2xl font-extrabold text-primary-foreground">
              {(profile?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-primary-foreground truncate">{profile?.full_name || user?.email?.split("@")[0] || "User"}</h2>
            <button onClick={() => setEditing(!editing)} className="text-xs text-primary-foreground/80 hover:text-primary-foreground underline underline-offset-2">
              {editing ? "Cancel" : "View / edit profile"}
            </button>
            {user && (
              <div className="mt-1.5 flex items-center gap-2">
                <code className="text-[10px] font-mono bg-primary-foreground/15 text-primary-foreground px-2 py-0.5 rounded-full backdrop-blur-sm">
                  ID: {user.id.slice(0, 8)}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.id.slice(0, 8));
                    toast.success("ID کاپی ہو گئی — ایڈمن کو بھیجیں");
                  }}
                  className="text-[10px] text-primary-foreground/90 hover:text-primary-foreground flex items-center gap-0.5"
                >
                  <Copy className="w-3 h-3" /> کاپی
                </button>
              </div>
            )}
          </div>
        </div>
        {editing && (
          <div className="relative mt-4 space-y-3 bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl">
            <Input placeholder="پورا نام" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="فون نمبر" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="پتہ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Button onClick={updateProfile} className="w-full">محفوظ کریں</Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <button onClick={() => setShowOrders(!showOrders)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border hover:shadow-md transition-shadow">
          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Orders</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border hover:shadow-md transition-shadow">
          <Heart className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Favourites</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border hover:shadow-md transition-shadow">
          <MapPin className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Addresses</span>
        </button>
      </div>

      {/* Referral Card */}
      {profile?.referral_code && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">اپنا ریفرل کوڈ شیئر کریں</p>
                <p className="font-mono text-2xl font-extrabold text-primary tracking-widest">{profile.referral_code}</p>
                <p className="text-[11px] text-muted-foreground mt-1">دوست join کریں گے تو دونوں کو بونس ملے گا</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(profile.referral_code);
                  toast.success("کوڈ کاپی ہو گیا");
                }}>
                  <Copy className="w-4 h-4 mr-1" /> کاپی
                </Button>
                <Button size="sm" onClick={() => {
                  const msg = `EasyLife app join کریں اور بہترین آفرز پائیں! میرا ریفرل کوڈ: ${profile.referral_code}\n\nhttps://easylife.apnahub.online`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }} className="bg-green-600 hover:bg-green-700">
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Section (collapsible) */}
      {showOrders && (
        <div className="px-4 pb-4">
          <h3 className="text-lg font-extrabold text-foreground mb-3">میرے آرڈرز</h3>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">ابھی کوئی آرڈر نہیں</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="bg-card rounded-2xl p-4 border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                      <p className="font-bold text-foreground">Rs {o.total_amount}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</p>
                    </div>
                    <Badge className={statusColor(o.status)}>{statusLabel[o.status] || o.status}</Badge>
                  </div>
                  {o.status !== "delivered" && o.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={() => navigate(`/order-tracking/${o.id}`)}>
                      ٹریک کریں 📍
                    </Button>
                  )}
                  {o.order_items?.length > 0 && (
                    <>
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                        {expandedOrder === o.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedOrder === o.id ? "چھپائیں" : `آئٹمز (${o.order_items.length})`}
                      </button>
                      {expandedOrder === o.id && (
                        <div className="bg-secondary/30 rounded-xl p-3 space-y-1">
                          {o.order_items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name} × {item.quantity}</span>
                              <span className="font-bold">Rs {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Perks Section */}
      <div className="px-4 py-2">
        <h3 className="text-lg font-extrabold text-foreground mb-3">Perks for you</h3>
        <div className="bg-card rounded-2xl border divide-y">
          {roles.includes("restaurant_owner") && (
            <button onClick={() => navigate("/restaurant-dashboard")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Pencil className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Restaurant Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {roles.includes("rider") && (
            <button onClick={() => navigate("/rider-dashboard")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Rider Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {roles.includes("admin") && (
            <button onClick={() => navigate("/admin")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-destructive" />
                <span className="text-sm font-semibold text-foreground">Admin Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {roles.includes("support") && (
            <button onClick={() => navigate("/support-dashboard")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Headphones className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Support Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {roles.includes("mechanic") && (
            <button onClick={() => navigate("/mechanic-dashboard")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-semibold text-foreground">Mechanic Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => navigate("/wallet")} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Wallet / والیٹ</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">Become a pro</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">EasyLife Rewards</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Vouchers</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Fingerprint Registration */}
      <div className="px-4 py-2">
        <h3 className="text-lg font-extrabold text-foreground mb-3">سیکیورٹی / Security</h3>
        <div className="bg-card rounded-2xl border divide-y">
          <button
            onClick={async () => {
              try {
                const session = await supabase.auth.getSession();
                const token = session.data.session?.access_token;
                if (!token) { toast.error("پہلے لاگ ان کریں"); return; }

                const optRes = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/register-options`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({}),
                  }
                );
                const optData = await optRes.json();
                if (optData.error) throw new Error(optData.error);

                const credential = await startRegistration({ optionsJSON: optData });

                const verifyRes = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/register-verify`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({ credential, deviceName: "My Phone" }),
                  }
                );
                const verifyData = await verifyRes.json();
                if (verifyData.error) throw new Error(verifyData.error);

                toast.success("فنگر پرنٹ رجسٹر ہو گیا! 🎉 / Fingerprint registered!");
              } catch (err: any) {
                if (err.name === "NotAllowedError") {
                  toast.error("فنگر پرنٹ منسوخ ہو گیا");
                } else {
                  toast.error(err.message || "فنگر پرنٹ رجسٹر نہیں ہوا");
                }
              }
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-primary" />
              <div className="text-left">
                <span className="text-sm font-semibold text-foreground block">فنگر پرنٹ رجسٹر کریں</span>
                <span className="text-xs text-muted-foreground">Register Fingerprint for quick login</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 py-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" /> لاگ آؤٹ
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>لاگ آؤٹ کریں؟ / Logout?</AlertDialogTitle>
              <AlertDialogDescription>
                کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟ / Are you sure you want to logout?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>نہیں / Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                ہاں، لاگ آؤٹ / Yes, Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Profile;
