import { useCallback, useEffect, useState } from "react";
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
import { LogOut, ShoppingBag, Store, Bike, MapPin, Plus, Trash2, RefreshCw, Users, Shield, ShoppingCart, Wrench, Megaphone, FileImage, Pencil, Check, X, Package, Ticket, Clapperboard, BellRing, LayoutDashboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import GroceryTab from "@/components/admin/GroceryTab";
import ServicesTab from "@/components/admin/ServicesTab";
import AdsTab from "@/components/admin/AdsTab";
import PhotoOrdersTab from "@/components/admin/PhotoOrdersTab";
import WholesaleCategoriesTab from "@/components/admin/WholesaleCategoriesTab";
import ApplicationsTab from "@/components/admin/ApplicationsTab";
import GroceryDispatchTab from "@/components/admin/GroceryDispatchTab";
import CitySettingsTab from "@/components/admin/CitySettingsTab";
import DeliveryRatesTab from "@/components/admin/DeliveryRatesTab";
import AuditLogTab from "@/components/admin/AuditLogTab";
import VouchersTab from "@/components/admin/VouchersTab";
import ReelsTab from "@/components/admin/ReelsTab";
import PayoutsTab from "@/components/admin/PayoutsTab";
import RiderRemittancesTab from "@/components/admin/RiderRemittancesTab";
import RevenueTab from "@/components/admin/RevenueTab";
import CommissionRulesTab from "@/components/admin/CommissionRulesTab";
import BankAccountsTab from "@/components/admin/BankAccountsTab";
import RiderPayTab from "@/components/admin/RiderPayTab";
import OverviewTab from "@/components/admin/OverviewTab";
import AlertCenter from "@/components/admin/AlertCenter";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingRemittances, setPendingRemittances] = useState(0);
  const [tab, setTab] = useState("overview");
  const [opsTab, setOpsTab] = useState("orders");
  const [partnersTab, setPartnersTab] = useState("applications");
  const [financeTab, setFinanceTab] = useState("revenue");
  const [contentTab, setContentTab] = useState("ads");
  const [settingsTab, setSettingsTab] = useState("city-settings");

  const goto = useCallback((section: string, sub?: string) => {
    setTab(section);
    if (sub) {
      if (section === "operations") setOpsTab(sub);
      else if (section === "partners") setPartnersTab(sub);
      else if (section === "finance") setFinanceTab(sub);
      else if (section === "content") setContentTab(sub);
      else if (section === "settings") setSettingsTab(sub);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadPending = async () => {
      const { count } = await supabase.from("rider_remittances").select("id", { count: "exact", head: true }).eq("status", "pending");
      setPendingRemittances(count || 0);
    };
    loadPending();
    const channel = supabase.channel("admin-remittance-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rider_remittances" }, () => {
        setPendingRemittances((count) => count + 1);
        toast.info("رائیڈر نے نئی ادائیگی سلپ بھیجی ہے", { id: "new-rider-remittance" });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rider_remittances" }, loadPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

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
          <Button variant="default" size="sm" onClick={() => navigate("/operations")}>🎛️ Operations</Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>🏠 ہوم</Button>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 grid h-auto grid-cols-3 gap-1.5 bg-transparent sm:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="overview" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><LayoutDashboard className="h-5 w-5" /> کمانڈ سینٹر</TabsTrigger>
            <TabsTrigger value="operations" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><ShoppingBag className="h-5 w-5" /> آپریشنز</TabsTrigger>
            <TabsTrigger value="partners" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><Store className="h-5 w-5" /> پارٹنرز</TabsTrigger>
            <TabsTrigger value="people" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><Users className="h-5 w-5" /> لوگ اور رولز</TabsTrigger>
            <TabsTrigger value="finance" className="relative h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><Ticket className="h-5 w-5" /> فنانس{pendingRemittances > 0 && <Badge className="absolute end-1 top-1 h-5 min-w-5 justify-center px-1 text-[10px]">{pendingRemittances}</Badge>}</TabsTrigger>
            <TabsTrigger value="content" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><Megaphone className="h-5 w-5" /> مواد اور آفرز</TabsTrigger>
            <TabsTrigger value="settings" className="h-14 flex-col gap-1 rounded-xl sm:h-16 border bg-card text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"><MapPin className="h-5 w-5" /> سیٹنگز</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4"><AlertCenter onNavigate={goto} /><OverviewTab onNavigate={goto} /></TabsContent>

          <TabsContent value="operations" className="admin-compact">
            <Tabs value={opsTab} onValueChange={setOpsTab}>
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1"><TabsTrigger value="orders">آرڈرز</TabsTrigger><TabsTrigger value="grocery-dispatch">ڈسپیچ</TabsTrigger><TabsTrigger value="photo-orders">فوٹو آرڈرز</TabsTrigger><TabsTrigger value="audit">آڈٹ لاگ</TabsTrigger></TabsList>
              <TabsContent value="orders"><OrdersTab /></TabsContent><TabsContent value="grocery-dispatch"><GroceryDispatchTab /></TabsContent><TabsContent value="photo-orders"><PhotoOrdersTab /></TabsContent><TabsContent value="audit"><AuditLogTab /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="partners" className="admin-compact">
            <Tabs value={partnersTab} onValueChange={setPartnersTab}>
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1"><TabsTrigger value="applications">درخواستیں</TabsTrigger><TabsTrigger value="restaurants">ریسٹورنٹس</TabsTrigger><TabsTrigger value="riders">رائیڈرز</TabsTrigger><TabsTrigger value="grocery">گروسری</TabsTrigger><TabsTrigger value="services">سروسز</TabsTrigger><TabsTrigger value="wholesale-cats">بازار کیٹیگریز</TabsTrigger></TabsList>
              <TabsContent value="applications"><ApplicationsTab /></TabsContent><TabsContent value="restaurants"><RestaurantsTab /></TabsContent><TabsContent value="riders"><RidersTab /></TabsContent><TabsContent value="grocery"><GroceryTab /></TabsContent><TabsContent value="services"><ServicesTab /></TabsContent><TabsContent value="wholesale-cats"><WholesaleCategoriesTab /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="people"><UsersTab /></TabsContent>

          <TabsContent value="finance" className="admin-compact">
            <Tabs value={financeTab} onValueChange={setFinanceTab}><TabsList className="mb-4 flex h-auto flex-wrap gap-1"><TabsTrigger value="revenue">پلیٹ فارم آمدنی</TabsTrigger><TabsTrigger value="banks">بینک اور اسٹیٹمنٹ</TabsTrigger><TabsTrigger value="payouts">وینڈر پیمنٹس</TabsTrigger><TabsTrigger value="rider-remit" className="gap-1"><BellRing className="h-3.5 w-3.5" /> رائیڈر سیٹلمنٹ{pendingRemittances > 0 && <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">{pendingRemittances}</Badge>}</TabsTrigger><TabsTrigger value="rider-pay">رائیڈر تنخواہ</TabsTrigger><TabsTrigger value="rates">کمیشن شرحیں</TabsTrigger></TabsList><TabsContent value="revenue"><RevenueTab /></TabsContent><TabsContent value="banks"><BankAccountsTab /></TabsContent><TabsContent value="payouts"><PayoutsTab /></TabsContent><TabsContent value="rider-remit"><RiderRemittancesTab /></TabsContent><TabsContent value="rider-pay"><RiderPayTab /></TabsContent><TabsContent value="rates"><CommissionRulesTab /></TabsContent></Tabs>
          </TabsContent>

          <TabsContent value="content">
            <Tabs value={contentTab} onValueChange={setContentTab}><TabsList className="mb-4 flex h-auto flex-wrap gap-1"><TabsTrigger value="ads">ایڈز</TabsTrigger><TabsTrigger value="vouchers">واؤچرز</TabsTrigger><TabsTrigger value="reels">ریلز</TabsTrigger></TabsList><TabsContent value="ads"><AdsTab /></TabsContent><TabsContent value="vouchers"><VouchersTab /></TabsContent><TabsContent value="reels"><ReelsTab /></TabsContent></Tabs>
          </TabsContent>

          <TabsContent value="settings" className="admin-compact">
            <Tabs value={settingsTab} onValueChange={setSettingsTab}><TabsList className="mb-4 flex h-auto flex-wrap gap-1"><TabsTrigger value="city-settings">شہر سیٹنگز</TabsTrigger><TabsTrigger value="delivery-rates">ڈلیوری کرایہ</TabsTrigger><TabsTrigger value="cities">شہر</TabsTrigger></TabsList><TabsContent value="city-settings"><CitySettingsTab /></TabsContent><TabsContent value="delivery-rates"><DeliveryRatesTab /></TabsContent><TabsContent value="cities"><CitiesTab /></TabsContent></Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Primary app owner ID - hardcoded for UI protection
const APP_OWNER_ID = "52634431-32e8-4bd7-b171-d92c2add25ff";

// ─── Users / Roles ──────────────────────────────
const UsersTab = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleType, setRoleType] = useState("restaurant_owner");
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [managerCategories, setManagerCategories] = useState<any[]>([]);
  const [catDialogUser, setCatDialogUser] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  const isAppOwner = user?.id === APP_OWNER_ID;

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rls }, { data: cats }, { data: mgrCats }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, created_at"),
      supabase.from("user_roles").select("*"),
      supabase.from("service_categories").select("id, name").order("sort_order"),
      supabase.from("service_manager_categories").select("*"),
    ]);
    setProfiles(profs || []);
    setRoles(rls || []);
    setAllCategories(cats || []);
    setManagerCategories(mgrCats || []);
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

    // Secondary admins can't assign admin role
    if (roleType === "admin" && !isAppOwner) {
      toast.error("صرف ایپ اونر ہی ایڈمن رول دے سکتا ہے");
      return;
    }

    const { error } = await supabase.from("user_roles").insert({ user_id: matchedProfile.id, role: roleType as any });
    if (error) { toast.error(error.message); return; }

    if (roleType === "rider") {
      await supabase.from("riders").upsert({ id: matchedProfile.id });
    }

    toast.success(`${roleType} رول شامل ہو گیا!`);
    setRoleEmail("");
    fetchData();
  };

  const quickAddRole = async (userId: string, role: string) => {
    const existingRoles = getUserRoles(userId);
    if (existingRoles.includes(role)) { toast.error("یہ رول پہلے سے موجود ہے"); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) { toast.error(error.message); return; }
    if (role === "rider") await supabase.from("riders").upsert({ id: userId });
    toast.success(`${role} رول شامل ہو گیا!`);
    fetchData();
  };

  const removeRole = async (userId: string, role: string) => {
    // Double protection: prevent removing admin from app owner in UI
    if (userId === APP_OWNER_ID && role === "admin") {
      toast.error("🔒 ایپ اونر کا ایڈمن رول کبھی نہیں ہٹایا جا سکتا!");
      return;
    }
    // Secondary admins can't remove admin role from anyone
    if (role === "admin" && !isAppOwner) {
      toast.error("صرف ایپ اونر ہی ایڈمن رول ہٹا سکتا ہے");
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("رول ہٹا دیا گیا");
    fetchData();
  };

  const getUserManagerCategories = (userId: string) => 
    managerCategories.filter((mc) => mc.user_id === userId).map((mc) => mc.category_id);

  const openCategoryDialog = (userId: string) => {
    setCatDialogUser(userId);
    setCatDialogOpen(true);
  };

  const toggleManagerCategory = async (userId: string, categoryId: string) => {
    const existing = managerCategories.find((mc) => mc.user_id === userId && mc.category_id === categoryId);
    if (existing) {
      const { error } = await supabase.from("service_manager_categories").delete().eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("کیٹیگری ہٹا دی گئی");
    } else {
      const { error } = await supabase.from("service_manager_categories").insert({ user_id: userId, category_id: categoryId });
      if (error) { toast.error(error.message); return; }
      toast.success("کیٹیگری اسائن ہو گئی");
    }
    fetchData();
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID کاپی ہو گئی");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> یوزرز اور رولز</CardTitle>
        {isAppOwner && (
          <p className="text-xs text-muted-foreground mt-1">👑 آپ ایپ اونر ہیں — آپ کا ایڈمن رول مستقل محفوظ ہے</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="یوزر ID (پہلے 8 حروف)" value={roleEmail} onChange={(e) => setRoleEmail(e.target.value)} className="max-w-[200px]" />
          <select className="border rounded-md p-2 bg-background text-foreground text-sm" value={roleType} onChange={(e) => setRoleType(e.target.value)}>
            <option value="restaurant_owner">Restaurant Owner</option>
            <option value="rider">Rider</option>
            <option value="mechanic">Mechanic</option>
            <option value="support">Support</option>
            <option value="service_manager">Service Manager</option>
            {isAppOwner && <option value="admin">Admin</option>}
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
                const isOwner = p.id === APP_OWNER_ID;
                return (
                  <TableRow key={p.id} className={isOwner ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs cursor-pointer hover:text-primary" onClick={() => copyId(p.id)} title="کاپی کرنے کے لیے کلک کریں">{p.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {p.full_name || "—"}
                        {isOwner && <span title="App Owner">👑</span>}
                      </div>
                    </TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.map((r) => (
                          <Badge key={r} variant="outline" className={`text-xs ${isOwner && r === "admin" ? "border-primary bg-primary/10 font-bold" : ""}`}>
                            {isOwner && r === "admin" ? "🔒 " : ""}{r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.filter((r) => r !== "customer").map((r) => {
                          // Don't show delete button for app owner's admin role
                          if (isOwner && r === "admin") return (
                            <Badge key={r} className="h-6 text-xs px-2 bg-primary/20 text-primary border border-primary/30">
                              🔒 محفوظ
                            </Badge>
                          );
                          // Secondary admins can't remove admin roles
                          if (r === "admin" && !isAppOwner) return (
                            <Badge key={r} className="h-6 text-xs px-2 bg-muted text-muted-foreground">
                              admin 🔒
                            </Badge>
                          );
                          return (
                            <Button key={r} size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => removeRole(p.id, r)}>
                              {r} ❌
                            </Button>
                          );
                        })}
                        {/* Quick role buttons */}
                        {!userRoles.includes("restaurant_owner") && (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => quickAddRole(p.id, "restaurant_owner")}>
                            🍽️ ریسٹورنٹ اونر
                          </Button>
                        )}
                        {/* Category assignment for service managers */}
                        {userRoles.includes("service_manager") && (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-primary text-primary" onClick={() => openCategoryDialog(p.id)}>
                            📂 کیٹیگریز ({getUserManagerCategories(p.id).length})
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Category Assignment Dialog */}
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>سروس مینیجر کیٹیگریز اسائن کریں</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {catDialogUser && (
                <p className="text-xs text-muted-foreground mb-3">
                  یوزر: {profiles.find(p => p.id === catDialogUser)?.full_name || catDialogUser.slice(0, 8)}
                </p>
              )}
              {allCategories.map((cat) => {
                const isAssigned = catDialogUser ? getUserManagerCategories(catDialogUser).includes(cat.id) : false;
                return (
                  <Button
                    key={cat.id}
                    variant={isAssigned ? "default" : "outline"}
                    className="w-full justify-between h-9 text-sm"
                    onClick={() => catDialogUser && toggleManagerCategory(catDialogUser, cat.id)}
                  >
                    {cat.name}
                    {isAssigned && <Check className="w-4 h-4" />}
                  </Button>
                );
              })}
              {allCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-4">کوئی سروس کیٹیگری نہیں ملی — پہلے سروسز ٹیب میں کیٹیگری بنائیں</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// ─── Haversine distance (km) ────────────────────
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Orders ─────────────────────────────────────
const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderProfiles, setRiderProfiles] = useState<any[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  const fetchOrders = async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: ridersData }] = await Promise.all([
      supabase.from("orders").select("*, order_items(*), restaurants(name, description, delivery_mode)").order("created_at", { ascending: false }).limit(50),
      supabase.from("riders").select("id, is_available, current_lat, current_lng"),
    ]);
    setOrders(ordersData || []);
    const allRiders = ridersData || [];
    setRiders(allRiders);
    // Fetch rider profiles for names
    if (allRiders.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", allRiders.map(r => r.id));
      setRiderProfiles(profs || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
        fetchOrders();
        const nw = payload.new || {};
        const old = payload.old || {};
        // Restaurant accepted an order and no rider is assigned yet → alert admin
        if (nw.status === "confirmed" && old.status !== "confirmed" && !nw.rider_id) {
          triggerAlert("ریسٹورنٹ نے آرڈر قبول کر لیا — رائیڈر تفویض کریں!");
          toast.info("✅ آرڈر قبول ہوا — رائیڈر تفویض کریں");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (order: any, status: string) => {
    if (["delivered", "completed", "cancelled"].includes(order.status)) {
      toast.error("یہ آرڈر بند ہو چکا ہے — اسے واپس نہیں بدلا جا سکتا");
      return;
    }
    if (status !== "cancelled") {
      toast.error("ایڈمن صرف rider assign یا emergency cancel کرے گا؛ status ریسٹورنٹ/رائیڈر چلائیں گے");
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchOrders();
  };

  const assignRider = async (orderId: string, riderId: string) => {
    const { error } = await (supabase.rpc as any)("admin_offer_order_to_rider", { _kind: "food", _order_id: orderId, _rider_id: riderId, _delivery_fee: null });
    if (error) { toast.error(error.message); return; }
    toast.success("رائیڈر کو آفر بھیج دی گئی — قبولیت کا انتظار ہے 🏍️");
    fetchOrders();
  };

  const retryDispatch = async (orderId: string) => {
    const { error } = await (supabase.rpc as any)("retry_order_dispatch", { _kind: "food", _order_id: orderId });
    if (error) { toast.error(error.message); return; }
    toast.success("قریب ترین رائیڈر کو نئی آفر بھیج دی گئی");
    fetchOrders();
  };

  const getRiderName = (riderId: string) => {
    const prof = riderProfiles.find(p => p.id === riderId);
    return prof?.full_name || riderId.slice(0, 8);
  };

  const getRiderPhone = (riderId: string) => {
    const prof = riderProfiles.find(p => p.id === riderId);
    return prof?.phone || "";
  };

  // Get nearest riders sorted by distance to order's delivery location
  const getNearestRiders = (order: any) => {
    const availableRiders = riders.filter(r => r.is_available && r.current_lat && r.current_lng);
    if (!order.delivery_lat || !order.delivery_lng) return availableRiders.slice(0, 5);
    return availableRiders
      .map(r => ({
        ...r,
        distance: haversineKm(r.current_lat, r.current_lng, order.delivery_lat, order.delivery_lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", preparing: "bg-accent text-accent-foreground", delivering: "bg-primary text-primary-foreground", delivered: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="آرڈر قبول ہوا — رائیڈر تفویض کریں!" />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>آرڈرز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>

        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-center text-muted-foreground py-8">کوئی آرڈر نہیں</p>}
            {orders.map((o) => {
              const deliveryMode = o.restaurants?.delivery_mode || "platform";
              const nearestRiders = getNearestRiders(o);
              const isClosed = ["delivered", "completed", "cancelled"].includes(o.status);
              const needsRider = deliveryMode !== "self" && ["confirmed", "preparing", "delivering"].includes(o.status) && !o.rider_id;
              return (
                <div key={o.id} className="rounded-lg border px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span className="font-bold text-xs">Rs {o.total_amount}</span>
                    <Badge className={`${statusColor(o.status)} h-5 px-1.5 text-[10px]`}>{o.status === "confirmed" ? "قبول شدہ" : o.status}</Badge>
                    {needsRider && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">رائیڈر درکار</Badge>}
                    {o.rider_id && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{getRiderName(o.rider_id)}</Badge>}
                    {deliveryMode === "self" && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">خود ڈلیوری</Badge>}
                    <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ur-PK")}</span>
                    <button className="ms-auto text-[11px] text-primary hover:underline" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                      {expandedOrder === o.id ? "بند ▲" : `تفصیل (${o.order_items?.length || 0}) ▼`}
                    </button>
                  </div>

                  {expandedOrder === o.id && (
                    <div className="space-y-1.5">
                      {o.order_items?.length > 0 && (
                        <div className="rounded-md bg-secondary/30 p-2 space-y-0.5">
                          {o.order_items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-[11px]">
                              <span>{item.name} × {item.quantity}</span>
                              <span className="font-bold">Rs {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid gap-0.5 text-[11px] text-muted-foreground">
                        <p>🏪 {o.restaurants?.name || "ریسٹورنٹ"} · {o.payment_method}</p>
                        {o.delivery_address && <p>📍 {o.delivery_address}</p>}
                        {o.rider_id && <p>🏍️ {getRiderName(o.rider_id)}{getRiderPhone(o.rider_id) && ` · 📞 ${getRiderPhone(o.rider_id)}`}</p>}
                      </div>

                      {needsRider && (
                        <div className="rounded-md bg-secondary/20 p-2 space-y-1">
                          <p className="text-[11px] font-bold">🏍️ قریب ترین رائیڈرز:</p>
                          {nearestRiders.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">کوئی آن لائن رائیڈر نہیں</p>
                          ) : nearestRiders.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between rounded-md border bg-background px-2 py-1">
                              <p className="min-w-0 truncate text-[11px]">
                                <span className="font-bold">{getRiderName(r.id)}</span>
                                {r.distance != null ? ` · ${r.distance.toFixed(1)} km` : ""}
                              </p>
                              <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => assignRider(o.id, r.id)}>تفویض</Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        {!o.rider_id && o.dispatch_state === "stuck" && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => retryDispatch(o.id)}>دوبارہ ڈسپیچ</Button>
                        )}
                        {!isClosed && o.status !== "delivering" && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-destructive" onClick={() => updateStatus(o, "cancelled")}>Emergency cancel</Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Restaurants ────────────────────────────────
const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const [ownerInput, setOwnerInput] = useState("");

  const fetchRests = async () => {
    setLoading(true);
    const [{ data: rests }, { data: profs }] = await Promise.all([
      supabase.from("restaurants").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setRestaurants(rests || []);
    setAllProfiles(profs || []);
    setLoading(false);
  };

  useEffect(() => { fetchRests(); }, []);

  const getOwnerName = (ownerId: string) => allProfiles.find((p) => p.id === ownerId)?.full_name || ownerId.slice(0, 8);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("restaurants").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetchRests();
  };

  const changeOwner = async (restId: string) => {
    if (!ownerInput.trim()) return;
    const matchedProfile = allProfiles.find((p) => p.id === ownerInput);
    if (!matchedProfile) { toast.error("یوزر نہیں ملا"); return; }
    // Auto-assign restaurant_owner role
    await supabase.from("user_roles").upsert({ user_id: matchedProfile.id, role: "restaurant_owner" as any }, { onConflict: "user_id,role" });
    const { error } = await supabase.from("restaurants").update({ owner_id: matchedProfile.id }).eq("id", restId);
    if (error) { toast.error(error.message); return; }
    toast.success(`اونر تبدیل → ${matchedProfile.full_name || matchedProfile.id.slice(0, 8)}`);
    setEditingOwner(null);
    setOwnerInput("");
    fetchRests();
  };

  const deleteRestaurant = async (id: string) => {
    if (!window.confirm("کیا آپ واقعی یہ ریسٹورنٹ حذف کرنا چاہتے ہیں؟")) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        toast.error("یہ ریسٹورنٹ حذف نہیں ہو سکتا کیونکہ اس سے آرڈرز منسلک ہیں");
      } else {
        toast.error(error.message);
      }
      return;
    }
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
                <TableHead>اونر</TableHead>
                <TableHead>ریٹنگ</TableHead>
                <TableHead>ایکٹو</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    {editingOwner === r.id ? (
                      <div className="flex items-center gap-1">
                        <select className="border rounded p-1 bg-background text-foreground text-xs max-w-[140px]" value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)}>
                          <option value="">یوزر منتخب کریں</option>
                          {allProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</option>)}
                        </select>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => changeOwner(r.id)}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingOwner(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:text-primary text-xs" onClick={() => { setEditingOwner(r.id); setOwnerInput(r.owner_id); }}>
                        {getOwnerName(r.owner_id)} <Pencil className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>⭐ {r.rating}</TableCell>
                  <TableCell>
                    <Badge className={r.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {r.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(r.id, r.is_active)}>
                      {r.is_active ? "بند" : "فعال"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteRestaurant(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {restaurants.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">کوئی ریسٹورنٹ نہیں</TableCell></TableRow>}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState("");

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

  const updateFee = async (id: string) => {
    const fee = Number(editFee);
    if (isNaN(fee) || fee < 0) { toast.error("درست فیس درج کریں"); return; }
    const { error } = await supabase.from("cities").update({ delivery_fee: fee }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ڈلیوری فیس اپڈیٹ ہو گئی ✅");
    setEditingId(null);
    fetchCities();
  };

  const startEdit = (city: any) => {
    setEditingId(city.id);
    setEditFee(String(city.delivery_fee || 0));
  };

  const deleteCity = async (id: string) => {
    if (!window.confirm("کیا آپ واقعی یہ شہر حذف کرنا چاہتے ہیں؟")) return;
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        toast.error("یہ شہر حذف نہیں ہو سکتا کیونکہ اس سے آرڈرز یا ریسٹورنٹس منسلک ہیں");
      } else {
        toast.error(error.message);
      }
      return;
    }
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
                  <TableCell>
                    {editingId === c.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editFee}
                          onChange={(e) => setEditFee(e.target.value)}
                          className="h-7 w-24 text-sm"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && updateFee(c.id)}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateFee(c.id)}>
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:text-primary" onClick={() => startEdit(c)}>
                        Rs {c.delivery_fee} <Pencil className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      </span>
                    )}
                  </TableCell>
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
