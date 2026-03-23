import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Bike, ArrowLeft, RefreshCw, Wallet, TrendingUp, Package, Navigation } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";

const RiderDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [riderData, setRiderData] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "rider" as any })
        .then(({ data }) => setHasRole(!!data));
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoadingData(true);
    const [{ data: rider }, { data: assigned }, { data: available }] = await Promise.all([
      supabase.from("riders").select("*").eq("id", user.id).single(),
      supabase.from("orders").select("*, order_items(*)").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("*, order_items(*)").in("status", ["confirmed", "preparing", "delivering"]).is("rider_id", null).order("created_at", { ascending: false }).limit(20),
    ]);
    setRiderData(rider);
    setMyOrders(assigned || []);
    setAvailableOrders(available || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (hasRole) fetchData();
  }, [hasRole, user]);

  // Realtime order updates
  useEffect(() => {
    if (!hasRole || !user) return;
    const channel = supabase
      .channel("rider-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT') triggerAlert();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hasRole, user]);

  const toggleAvailability = async () => {
    if (!riderData) return;
    const { error } = await supabase.from("riders").update({ is_available: !riderData.is_available }).eq("id", user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success(riderData.is_available ? "آپ آف لائن ہو گئے" : "آپ آن لائن ہو گئے");
    fetchData();
  };

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ rider_id: user!.id }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success("آرڈر قبول ہو گیا! 🏍️");
    fetchData();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchData();
  };

  if (loading || hasRole === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;

  if (!hasRole) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <Bike className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">آپ رائیڈر نہیں ہیں</h2>
          <p className="text-muted-foreground mb-4">ایڈمن سے رائیڈر کا رول حاصل کریں</p>
          <Button variant="outline" onClick={() => navigate("/")}>واپس جائیں</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نیا آرڈر دستیاب! / New order available!" />
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-primary">رائیڈر ڈیش بورڈ</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bike className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سٹیٹس</p>
                <div className="flex items-center gap-2">
                  <Switch checked={riderData?.is_available || false} onCheckedChange={toggleAvailability} />
                  <span className="font-bold">{riderData?.is_available ? "آن لائن" : "آف لائن"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">والٹ بیلنس</p>
                <p className="text-xl font-extrabold">Rs {riderData?.wallet_balance || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">کل آمدنی</p>
                <p className="text-xl font-extrabold">Rs {riderData?.total_earnings || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Orders to Pick Up */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> دستیاب آرڈرز</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {availableOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی دستیاب آرڈر نہیں</p>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((o) => (
                  <div key={o.id} className="bg-secondary/30 rounded-xl p-4 border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                        <p className="font-bold text-foreground">Rs {o.total_amount}</p>
                      </div>
                      <Button size="sm" onClick={() => acceptOrder(o.id)}>قبول کریں 🏍️</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">📍 {o.delivery_address || "پتہ نہیں"}</p>
                    {o.delivery_address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                      >
                        <Navigation className="w-3 h-3" /> نقشے میں دیکھیں
                      </a>
                    )}
                    {o.order_items?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {o.order_items.map((item: any) => (
                          <span key={item.id} className="mr-2">{item.name} ×{item.quantity}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Assigned Orders */}
        <Card>
          <CardHeader>
            <CardTitle>میرے آرڈرز</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : myOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی آرڈر نہیں</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>آئٹمز</TableHead>
                    <TableHead>ٹوٹل</TableHead>
                    <TableHead>سٹیٹس</TableHead>
                    <TableHead>پتہ</TableHead>
                    <TableHead>ایکشنز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">
                        {o.order_items?.map((item: any) => `${item.name}×${item.quantity}`).join(", ") || "—"}
                      </TableCell>
                      <TableCell>Rs {o.total_amount}</TableCell>
                      <TableCell><Badge>{o.status}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {o.delivery_address || "—"}
                        {o.delivery_address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                          >
                            <Navigation className="w-3 h-3" /> نقشہ
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        {o.status === "delivering" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderStatus(o.id, "delivered")}>
                            ڈلیور ہو گیا ✅
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiderDashboard;
