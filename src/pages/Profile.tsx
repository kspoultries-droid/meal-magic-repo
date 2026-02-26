import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, User, ShoppingBag, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";

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

  // Realtime order updates
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

  const statusLabel: Record<string, string> = {
    pending: "زیر التواء",
    confirmed: "تصدیق شدہ",
    preparing: "تیاری جاری",
    delivering: "ڈلیوری جاری",
    delivered: "مکمل ✅",
    cancelled: "منسوخ ❌",
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> واپس
        </Button>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> میرا پروفائل</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? "منسوخ" : "ایڈٹ"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">ای میل</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              {roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
            {editing ? (
              <div className="space-y-3 pt-2">
                <Input placeholder="پورا نام" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <Input placeholder="فون نمبر" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="پتہ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Button onClick={updateProfile}>محفوظ کریں</Button>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                <p className="text-sm"><span className="text-muted-foreground">نام:</span> {profile?.full_name || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">فون:</span> {profile?.phone || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">پتہ:</span> {profile?.address || "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-Based Navigation */}
        {roles.includes("restaurant_owner") && (
          <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/restaurant-dashboard")}>
            🍽️ ریسٹورنٹ ڈیش بورڈ
          </Button>
        )}
        {roles.includes("rider") && (
          <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/rider-dashboard")}>
            🏍️ رائیڈر ڈیش بورڈ
          </Button>
        )}
        {roles.includes("admin") && (
          <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/admin")}>
            ⚙️ ایڈمن ڈیش بورڈ
          </Button>
        )}

        {/* Orders History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> میرے آرڈرز</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی آرڈر نہیں</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-secondary/30 rounded-xl p-4 border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                        <p className="font-bold text-foreground">Rs {o.total_amount}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusColor(o.status)}>{statusLabel[o.status] || o.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{o.payment_method}</p>
                      </div>
                    </div>

                    {/* Expandable Order Items */}
                    {o.order_items?.length > 0 && (
                      <>
                        <button
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                        >
                          {expandedOrder === o.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedOrder === o.id ? "آئٹمز چھپائیں" : `آئٹمز دیکھیں (${o.order_items.length})`}
                        </button>
                        {expandedOrder === o.id && (
                          <div className="bg-background rounded-lg p-3 space-y-1 border">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
