import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, ShoppingBag, Store, Bike, MapPin, Plus, Trash2, RefreshCw, Users, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/auth");
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">ایڈمن ڈیش بورڈ</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>🏠 ہوم</Button>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="orders">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" /> آرڈرز</TabsTrigger>
            <TabsTrigger value="restaurants" className="gap-1"><Store className="h-4 w-4" /> ریسٹورنٹس</TabsTrigger>
            <TabsTrigger value="riders" className="gap-1"><Bike className="h-4 w-4" /> رائیڈرز</TabsTrigger>
            <TabsTrigger value="cities" className="gap-1"><MapPin className="h-4 w-4" /> شہر</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" /> یوزرز</TabsTrigger>
          </TabsList>

          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="restaurants"><RestaurantsTab /></TabsContent>
          <TabsContent value="riders"><RidersTab /></TabsContent>
          <TabsContent value="cities"><CitiesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Users / Roles ──────────────────────────────
const UsersTab = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleType, setRoleType] = useState("restaurant_owner");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rls }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, created_at"),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles(profs || []);
    setRoles(rls || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const addRole = async () => {
    if (!roleEmail.trim()) { toast.error("یوزر ID درکار ہے"); return; }
    const matchedProfile = profiles.find((p) => p.id.startsWith(roleEmail.trim()));
    if (!matchedProfile) { toast.error("یوزر نہیں ملا — مکمل ID یا شروع کے حروف لکھیں"); return; }

    const existingRoles = getUserRoles(matchedProfile.id);
    if (existingRoles.includes(roleType)) { toast.error("یہ رول پہلے سے موجود ہے"); return; }

    const { error } = await supabase.from("user_roles").insert({ user_id: matchedProfile.id, role: roleType as any });
    if (error) { toast.error(error.message); return; }

    if (roleType === "rider") {
      await supabase.from("riders").upsert({ id: matchedProfile.id });
    }

    toast.success(`${roleType} رول شامل ہو گیا!`);
    setRoleEmail("");
    fetchData();
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast.success("رول ہٹا دیا گیا");
    fetchData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> یوزرز اور رولز</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="یوزر ID (پہلے 8 حروف)" value={roleEmail} onChange={(e) => setRoleEmail(e.target.value)} className="max-w-[200px]" />
          <select className="border rounded-md p-2 bg-background text-foreground text-sm" value={roleType} onChange={(e) => setRoleType(e.target.value)}>
            <option value="restaurant_owner">Restaurant Owner</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={addRole}><Plus className="h-4 w-4 mr-1" /> رول دیں</Button>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>فون</TableHead>
                <TableHead>رولز</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const userRoles = getUserRoles(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell>{p.full_name || "—"}</TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.map((r) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.filter((r) => r !== "customer").map((r) => (
                          <Button key={r} size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => removeRole(p.id, r)}>
                            {r} ❌
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Orders ─────────────────────────────────────
const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: ridersData }] = await Promise.all([
      supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(50),
      supabase.from("riders").select("id, is_available").eq("is_available", true),
    ]);
    setOrders(ordersData || []);
    setRiders(ridersData || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchOrders();
  };

  const assignRider = async (orderId: string, riderId: string) => {
    const { error } = await supabase.from("orders").update({ rider_id: riderId }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success("رائیڈر تفویض ہو گیا! 🏍️");
    fetchOrders();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", preparing: "bg-accent text-accent-foreground", delivering: "bg-primary text-primary-foreground", delivered: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>آرڈرز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-center text-muted-foreground py-8">کوئی آرڈر نہیں</p>}
            {orders.map((o) => (
              <div key={o.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span className="ml-3 font-bold">Rs {o.total_amount}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColor(o.status)}>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">{o.payment_method}</span>
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</span>
                  </div>
                </div>

                {/* Order Items */}
                <button className="text-xs text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                  {expandedOrder === o.id ? "آئٹمز چھپائیں ▲" : `آئٹمز دیکھیں (${o.order_items?.length || 0}) ▼`}
                </button>
                {expandedOrder === o.id && o.order_items?.length > 0 && (
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                    {o.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-bold">Rs {item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Address */}
                {o.delivery_address && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}

                {/* Rider Assignment */}
                {o.status === "delivering" && !o.rider_id && riders.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">رائیڈر تفویض:</span>
                    {riders.map((r) => (
                      <Button key={r.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => assignRider(o.id, r.id)}>
                        🏍️ {r.id.slice(0, 6)}
                      </Button>
                    ))}
                  </div>
                )}
                {o.rider_id && <p className="text-xs text-muted-foreground">🏍️ رائیڈر: {o.rider_id.slice(0, 8)}</p>}

                {/* Status Actions */}
                <div className="flex gap-1 flex-wrap">
                  {["confirmed", "preparing", "delivering", "delivered", "cancelled"].map((s) =>
                    s !== o.status ? (
                      <Button key={s} size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => updateStatus(o.id, s)}>
                        {s}
                      </Button>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Restaurants ────────────────────────────────
const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRests = async () => {
    setLoading(true);
    const { data } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
    setRestaurants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRests(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("restaurants").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetchRests();
  };

  const deleteRestaurant = async (id: string) => {
    await supabase.from("restaurants").delete().eq("id", id);
    toast.success("حذف ہو گیا");
    fetchRests();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ریسٹورنٹس</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchRests}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ریٹنگ</TableHead>
                <TableHead>ڈلیوری</TableHead>
                <TableHead>کمیشن</TableHead>
                <TableHead>ایکٹو</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.rating}</TableCell>
                  <TableCell>{r.delivery_time}</TableCell>
                  <TableCell>{r.commission_rate}%</TableCell>
                  <TableCell>
                    <Badge className={r.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {r.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(r.id, r.is_active)}>
                      {r.is_active ? "بند کریں" : "فعال کریں"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteRestaurant(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {restaurants.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی ریسٹورنٹ نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Riders ─────────────────────────────────────
const RidersTab = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [riderProfiles, setRiderProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRiders = async () => {
    setLoading(true);
    const { data } = await supabase.from("riders").select("*");
    setRiders(data || []);
    // Get profiles for rider names
    if (data?.length) {
      const ids = data.map((r) => r.id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      setRiderProfiles(profs || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRiders(); }, []);

  const getProfile = (id: string) => riderProfiles.find((p) => p.id === id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>رائیڈرز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchRiders}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>فون</TableHead>
                <TableHead>دستیاب</TableHead>
                <TableHead>والٹ</TableHead>
                <TableHead>کل آمدنی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riders.map((r) => {
                const prof = getProfile(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell>{prof?.full_name || "—"}</TableCell>
                    <TableCell>{prof?.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={r.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {r.is_available ? "ہاں" : "نہیں"}
                      </Badge>
                    </TableCell>
                    <TableCell>Rs {r.wallet_balance}</TableCell>
                    <TableCell>Rs {r.total_earnings}</TableCell>
                  </TableRow>
                );
              })}
              {riders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی رائیڈر نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Cities ─────────────────────────────────────
const CitiesTab = () => {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");

  const fetchCities = async () => {
    setLoading(true);
    const { data } = await supabase.from("cities").select("*").order("name");
    setCities(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCities(); }, []);

  const addCity = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("cities").insert({ name: newName, delivery_fee: Number(newFee) || 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("شہر شامل ہو گیا");
    setNewName("");
    setNewFee("");
    fetchCities();
  };

  const deleteCity = async (id: string) => {
    await supabase.from("cities").delete().eq("id", id);
    toast.success("شہر حذف ہو گیا");
    fetchCities();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>شہر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="شہر کا نام" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="ڈلیوری فیس" type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} className="max-w-[120px]" />
          <Button onClick={addCity}><Plus className="h-4 w-4 mr-1" /> شامل</Button>
        </div>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شہر</TableHead>
                <TableHead>ڈلیوری فیس</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>Rs {c.delivery_fee}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteCity(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {cities.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">کوئی شہر نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
