import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Wrench, Phone, MapPin, Clock, CheckCircle, RefreshCw, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "نئی بکنگ", color: "bg-warning text-warning-foreground" },
  confirmed: { label: "تصدیق شدہ", color: "bg-primary text-primary-foreground" },
  in_progress: { label: "جاری ہے", color: "bg-accent text-accent-foreground" },
  completed: { label: "مکمل", color: "bg-success text-success-foreground" },
  cancelled: { label: "منسوخ", color: "bg-destructive text-destructive-foreground" },
};

const MechanicDashboard = () => {
  const { user, isMechanic, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  useEffect(() => {
    if (!loading && (!user || (!isMechanic && !isAdmin))) navigate("/auth");
  }, [user, isMechanic, isAdmin, loading, navigate]);

  const fetchData = async () => {
    setFetching(true);
    const [{ data: bks }, { data: svcs }, { data: provider }] = await Promise.all([
      supabase
        .from("service_bookings")
        .select("*")
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("services").select("id, name, category_id, price, duration"),
      user && !isAdmin
        ? supabase.from("service_providers").select("id").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setProviderId(provider?.id || null);
    setBookings(bks || []);
    setServices(svcs || []);
    setFetching(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user?.id, isAdmin]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("mechanic-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_bookings" }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT') triggerAlert();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getServiceName = (serviceId: string) => services.find((s) => s.id === serviceId)?.name || "—";

  const updateStatus = async (id: string, status: string) => {
    const changes: { status: string; provider_id?: string } = { status };
    if (providerId && (status === "confirmed" || status === "in_progress")) {
      changes.provider_id = providerId;
    }
    const { error } = await supabase.from("service_bookings").update(changes).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    setSelectedBooking(null);
    fetchData();
  };

  const viewDetails = async (booking: any) => {
    setSelectedBooking(booking);
    const { data } = await supabase.from("profiles").select("full_name, phone, address").eq("id", booking.customer_id).single();
    setCustomerProfile(data);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!isMechanic && !isAdmin) return null;

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const activeCount = bookings.filter((b) => b.status === "in_progress" || b.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-background">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نئی سروس بکنگ! / New service booking!" />
      <header className="border-b bg-card px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-primary">{t("role.mechanic")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>🏠</Button>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">نئی بکنگز</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{activeCount}</p>
              <p className="text-xs text-muted-foreground">جاری کام</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">سروس بکنگز</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fetching ? (
              <p className="text-muted-foreground text-center py-4">لوڈ ہو رہا ہے...</p>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">کوئی بکنگ نہیں</p>
            ) : (
              bookings.map((b) => {
                const st = statusMap[b.status] || statusMap.pending;
                return (
                  <div
                    key={b.id}
                    className="border rounded-xl p-3 space-y-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => viewDetails(b)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{getServiceName(b.service_id)}</span>
                      <Badge className={st.color}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.scheduled_date} • {b.scheduled_time}</span>
                      <span className="font-bold text-foreground">Rs {b.total_amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {b.address}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>بکنگ تفصیلات</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold">{getServiceName(selectedBooking.service_id)}</p>
                <Badge className={statusMap[selectedBooking.status]?.color}>
                  {statusMap[selectedBooking.status]?.label}
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                <p><Clock className="w-4 h-4 inline mr-1" /> {selectedBooking.scheduled_date} • {selectedBooking.scheduled_time}</p>
                <p><MapPin className="w-4 h-4 inline mr-1" /> {selectedBooking.address}</p>
                <p className="font-bold">Rs {selectedBooking.total_amount}</p>
                {selectedBooking.notes && <p className="text-muted-foreground">نوٹ: {selectedBooking.notes}</p>}
              </div>

              {/* Customer Info */}
              {customerProfile && (
                <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-1"><User className="w-4 h-4" /> {customerProfile.full_name || "—"}</p>
                  {customerProfile.phone && (
                    <a href={`tel:${customerProfile.phone}`} className="text-sm text-primary flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {customerProfile.phone}
                    </a>
                  )}
                  {customerProfile.address && <p className="text-xs text-muted-foreground">{customerProfile.address}</p>}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {selectedBooking.status === "pending" && (
                  <Button className="flex-1" onClick={() => updateStatus(selectedBooking.id, "confirmed")}>
                    <CheckCircle className="w-4 h-4 mr-1" /> قبول کریں
                  </Button>
                )}
                {selectedBooking.status === "confirmed" && (
                  <Button className="flex-1" onClick={() => updateStatus(selectedBooking.id, "in_progress")}>
                    <Wrench className="w-4 h-4 mr-1" /> کام شروع
                  </Button>
                )}
                {selectedBooking.status === "in_progress" && (
                  <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => updateStatus(selectedBooking.id, "completed")}>
                    <CheckCircle className="w-4 h-4 mr-1" /> مکمل ہو گیا
                  </Button>
                )}
                {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                  <Button variant="destructive" onClick={() => updateStatus(selectedBooking.id, "cancelled")}>
                    منسوخ
                  </Button>
                )}
              </div>

              {/* Call Customer */}
              {customerProfile?.phone && (
                <a href={`tel:${customerProfile.phone}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" /> کسٹمر کو کال کریں
                  </Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MechanicDashboard;
