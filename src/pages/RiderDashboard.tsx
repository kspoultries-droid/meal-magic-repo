import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Bike, ArrowLeft, RefreshCw, MapPin, Wallet, TrendingUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const RiderDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [riderData, setRiderData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
    const [{ data: rider }, { data: assignedOrders }] = await Promise.all([
      supabase.from("riders").select("*").eq("id", user.id).single(),
      supabase.from("orders").select("*").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setRiderData(rider);
    setOrders(assignedOrders || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (hasRole) fetchData();
  }, [hasRole, user]);

  const toggleAvailability = async () => {
    if (!riderData) return;
    const { error } = await supabase.from("riders").update({ is_available: !riderData.is_available }).eq("id", user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success(riderData.is_available ? "آپ آف لائن ہو گئے" : "آپ آن لائن ہو گئے");
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

        {/* Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>میرے آرڈرز</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {loadingData ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی آرڈر نہیں</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>ٹوٹل</TableHead>
                    <TableHead>سٹیٹس</TableHead>
                    <TableHead>پتہ</TableHead>
                    <TableHead>ایکشنز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                      <TableCell>Rs {o.total_amount}</TableCell>
                      <TableCell><Badge>{o.status}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{o.delivery_address || "—"}</TableCell>
                      <TableCell>
                        {o.status === "delivering" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderStatus(o.id, "delivered")}>
                            ڈلیور ہو گیا
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
