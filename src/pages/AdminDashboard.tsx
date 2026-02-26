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
import { LogOut, ShoppingBag, Store, Bike, MapPin, Plus, Trash2, RefreshCw } from "lucide-react";

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">ایڈمن ڈیش بورڈ</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" /> آرڈرز</TabsTrigger>
            <TabsTrigger value="restaurants" className="gap-1"><Store className="h-4 w-4" /> ریسٹورنٹس</TabsTrigger>
            <TabsTrigger value="riders" className="gap-1"><Bike className="h-4 w-4" /> رائیڈرز</TabsTrigger>
            <TabsTrigger value="cities" className="gap-1"><MapPin className="h-4 w-4" /> شہر</TabsTrigger>
          </TabsList>

          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="restaurants"><RestaurantsTab /></TabsContent>
          <TabsContent value="riders"><RidersTab /></TabsContent>
          <TabsContent value="cities"><CitiesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Orders ─────────────────────────────────────
const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ٹوٹل</TableHead>
                <TableHead>سٹیٹس</TableHead>
                <TableHead>پیمنٹ</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell>Rs {o.total_amount}</TableCell>
                  <TableCell><Badge className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                  <TableCell>{o.payment_method}</TableCell>
                  <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("ur-PK")}</TableCell>
                  <TableCell className="flex gap-1">
                    {["confirmed", "preparing", "delivering", "delivered", "cancelled"].map((s) =>
                      s !== o.status && (
                        <Button key={s} size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => updateStatus(o.id, s)}>
                          {s}
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی آرڈر نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Restaurants ────────────────────────────────
const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
    setRestaurants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("restaurants").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetch();
  };

  const deleteRestaurant = async (id: string) => {
    await supabase.from("restaurants").delete().eq("id", id);
    toast.success("حذف ہو گیا");
    fetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ریسٹورنٹس</CardTitle>
        <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
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
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("riders").select("*");
    setRiders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>رائیڈرز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>دستیاب</TableHead>
                <TableHead>والٹ</TableHead>
                <TableHead>کل آمدنی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riders.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge className={r.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                      {r.is_available ? "ہاں" : "نہیں"}
                    </Badge>
                  </TableCell>
                  <TableCell>Rs {r.wallet_balance}</TableCell>
                  <TableCell>Rs {r.total_earnings}</TableCell>
                </TableRow>
              ))}
              {riders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">کوئی رائیڈر نہیں</TableCell></TableRow>}
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

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("cities").select("*").order("name");
    setCities(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const addCity = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("cities").insert({ name: newName, delivery_fee: Number(newFee) || 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("شہر شامل ہو گیا");
    setNewName("");
    setNewFee("");
    fetch();
  };

  const deleteCity = async (id: string) => {
    await supabase.from("cities").delete().eq("id", id);
    toast.success("شہر حذف ہو گیا");
    fetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>شہر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="شہر کا نام" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="ڈلیوری فیس" type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} className="w-32" />
          <Button onClick={addCity}><Plus className="h-4 w-4 mr-1" /> شامل کریں</Button>
        </div>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ڈلیوری فیس</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>Rs {c.delivery_fee}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteCity(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
