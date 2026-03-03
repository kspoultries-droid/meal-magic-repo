import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, ShoppingBag, Heart, MapPin, ChevronRight, ChevronDown, ChevronUp, Crown, Gift, Ticket, LogOut, User, Pencil } from "lucide-react";
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
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: ords }, { data: userRoles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("orders").select("*, order_items(*)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    setProfile(prof);
    setOrders(ords || []);
    setRoles((userRoles || []).map((r: any) => r.role));
    if (prof) setForm({ full_name: prof.full_name || "", phone: prof.phone || "", address: prof.address || "" });
    setLoading(false);
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
    const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
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
      <div className="sticky top-0 z-50 bg-card border-b px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-foreground">Account</h1>
        <button className="p-2 rounded-full hover:bg-secondary">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* User Name & Profile Link */}
      <div className="px-4 pt-6 pb-4 border-b">
        <h2 className="text-2xl font-extrabold text-foreground">{profile?.full_name || user?.email?.split("@")[0] || "User"}</h2>
        <button onClick={() => setEditing(!editing)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {editing ? "Cancel" : "View profile"}
        </button>
        {editing && (
          <div className="mt-4 space-y-3">
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
              <span className="text-sm font-semibold text-foreground">Panda Rewards</span>
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

      {/* Logout */}
      <div className="px-4 py-6">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={async () => { await signOut(); navigate("/"); }}
        >
          <LogOut className="w-4 h-4 mr-2" /> لاگ آؤٹ
        </Button>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Profile;
