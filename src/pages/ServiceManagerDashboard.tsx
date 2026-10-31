import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ServiceChecklistEditor from "@/components/services/ServiceChecklistEditor";
import TicketsQueue from "@/components/support/TicketsQueue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Users, Star, DollarSign, Phone, MapPin, Clock, CheckCircle, AlertCircle, User } from "lucide-react";

import ServiceJobPanel from "@/components/services/ServiceJobPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CategoryInfo {
  id: string;
  name: string;
  work_checklist?: any;
}

interface Booking {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  total_amount: number;
  notes: string | null;
  customer_id: string;
  service_id: string;
  created_at: string;
  services?: { name: string; category_id: string } | null;
  customerProfile?: { full_name: string | null; phone: string | null } | null;
}

interface Provider {
  id: string;
  name: string;
  phone: string | null;
  is_available: boolean;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  category_id: string | null;
  address: string | null;
  service_categories?: { name: string } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
  services?: { name: string } | null;
  customerProfile?: { full_name: string | null } | null;
  provider_id: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: string | null;
  is_active: boolean;
  category_id: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "زیرِ التوا", color: "bg-warning text-warning-foreground" },
  confirmed: { label: "تصدیق شدہ", color: "bg-primary text-primary-foreground" },
  in_progress: { label: "جاری", color: "bg-accent text-accent-foreground" },
  completed: { label: "مکمل", color: "bg-success text-success-foreground" },
  cancelled: { label: "منسوخ", color: "bg-destructive text-destructive-foreground" },
};

const ServiceManagerDashboard = () => {
  const { user, isServiceManager, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || (!isServiceManager && !isAdmin))) {
      navigate("/");
    }
  }, [user, isServiceManager, isAdmin, loading]);

  useEffect(() => {
    if (user && (isServiceManager || isAdmin)) {
      fetchMyCategories();
    }
  }, [user, isServiceManager, isAdmin]);

  const fetchMyCategories = async () => {
    if (!user) return;
    const { data, error } = isAdmin ? await supabase.from("service_categories").select("id,name,work_checklist").order("sort_order") : await supabase.from("service_manager_categories").select("category_id,service_categories(id,name,work_checklist)").eq("user_id",user.id);
    if (error) toast.error(error.message);
    const cats = isAdmin ? (data || []) : (data || []).map((d:any) => d.service_categories).filter(Boolean);
    setCategories(cats as CategoryInfo[]);
    if (cats.length) await fetchAllData(cats.map((c:any) => c.id));
    setLoadingData(false);
  };

  const fetchAllData = async (categoryIds: string[]) => {
    // Fetch bookings for my categories' services
    const { data: svcData } = await supabase
      .from("services")
      .select("id, name, price, duration, is_active, category_id")
      .in("category_id", categoryIds);

    if (svcData) {
      setServices(svcData);
      const serviceIds = svcData.map((s) => s.id);

      // Fetch bookings
      if (serviceIds.length > 0) {
        const { data: bookingData } = await supabase
          .from("service_bookings")
          .select("*, services(name, category_id)")
          .in("service_id", serviceIds)
          .order("created_at", { ascending: false }).limit(100);

        if (bookingData) {
          // Fetch customer profiles
          const customerIds = [...new Set(bookingData.map((b) => b.customer_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", customerIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
          setBookings(
            bookingData.map((b) => ({
              ...b,
              customerProfile: profileMap.get(b.customer_id) || null,
            }))
          );
        }

        // Fetch reviews
        const { data: reviewData } = await supabase
          .from("service_reviews")
          .select("*, services(name)")
          .in("service_id", serviceIds)
          .order("created_at", { ascending: false }).limit(100);

        if (reviewData) {
          const customerIds = [...new Set(reviewData.map((r) => r.customer_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", customerIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
          setReviews(
            reviewData.map((r) => ({
              ...r,
              customerProfile: profileMap.get(r.customer_id) || null,
            }))
          );
        }
      }
    }

    // Fetch providers
    const { data: providerData } = await supabase
      .from("service_providers")
      .select("*, service_categories(name)")
      .in("category_id", categoryIds);

    if (providerData) setProviders(providerData);
  };

  const updateServicePrice = async (id: string, price: number) => {
    const { error } = await supabase
      .from("services")
      .update({ price })
      .eq("id", id);

    if (error) {
      toast.error("قیمت اپ ڈیٹ نہیں ہوئی");
    } else {
      toast.success("قیمت اپ ڈیٹ ہو گئی");
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
    }
  };

  const toggleProviderAvailability = async (id: string, available: boolean) => {
    const { error } = await supabase
      .from("service_providers")
      .update({ is_available: available })
      .eq("id", id);

    if (error) {
      toast.error("تبدیلی نہیں ہوئی");
    } else {
      setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, is_available: available } : p)));
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const activeProviders = providers.filter((p) => p.is_available).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-3xl">
        <h1 className="text-xl font-bold mb-1">سروس مینیجر ڈیش بورڈ</h1>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">زیرِ التوا</p>
                <p className="text-lg font-bold">{pendingBookings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">فعال ورکرز</p>
                <p className="text-lg font-bold">{activeProviders}/{providers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">اوسط ریٹنگ</p>
                <p className="text-lg font-bold">{avgRating}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">سروسز</p>
                <p className="text-lg font-bold">{services.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
            <TabsTrigger value="bookings" className="text-xs">بکنگز</TabsTrigger>
            <TabsTrigger value="workers" className="text-xs">ورکرز</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs">کوالٹی</TabsTrigger>
            <TabsTrigger value="complaints" className="text-xs">شکایات</TabsTrigger>
            <TabsTrigger value="checklists" className="text-xs">چیک لسٹ</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">قیمتیں</TabsTrigger>
          </TabsList>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-3 mt-3">
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">کوئی بکنگ نہیں</p>
            ) : (
              bookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{b.services?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {b.customerProfile?.full_name || "نامعلوم"}
                        </p>
                      </div>
                      <Badge className={`text-[10px] ${statusMap[b.status]?.color || ""}`}>
                        {statusMap[b.status]?.label || b.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {b.scheduled_date} - {b.scheduled_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.address?.slice(0, 30)}...
                      </span>
                      <span className="font-semibold text-foreground">Rs {b.total_amount}</span>
                    </div>
                    {b.customerProfile?.phone && (
                      <a
                        href={`tel:${b.customerProfile.phone}`}
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium"
                      >
                        <Phone className="w-3 h-3" /> {b.customerProfile.phone}
                      </a>
                    )}
                    {b.notes && <p className="text-xs bg-secondary p-2 rounded">{b.notes}</p>}
                    <Button size="sm" variant="outline" onClick={() => setSelectedBooking(b.id)}>تفصیل، کوٹیشن اور بل</Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* WORKERS TAB */}
          <TabsContent value="workers" className="space-y-3 mt-3">
            {providers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">کوئی ورکر نہیں</p>
            ) : (
              providers.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.service_categories?.name} · ⭐ {Number(p.rating).toFixed(1)} ({p.total_reviews})
                        </p>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="text-xs text-primary flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </a>
                        )}
                        {p.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {p.address}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={p.is_available ? "default" : "outline"}
                        className="text-xs h-7"
                        onClick={() => toggleProviderAvailability(p.id, !p.is_available)}
                      >
                        {p.is_available ? "فعال ✓" : "غیر فعال"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* QUALITY TAB */}
          <TabsContent value="quality" className="space-y-3 mt-3">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">کوئی ریویو نہیں</p>
            ) : (
              reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.services?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.customerProfile?.full_name || "نامعلوم"} · {new Date(r.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < r.rating ? "text-warning fill-warning" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs mt-2 bg-secondary p-2 rounded">{r.comment}</p>}
                    {r.rating <= 2 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                        <AlertCircle className="w-3 h-3" /> کم ریٹنگ - توجہ درکار
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="complaints"><TicketsQueue serviceOnly /></TabsContent>
          <TabsContent value="checklists"><ServiceChecklistEditor categories={categories} onSaved={() => void fetchMyCategories()}/></TabsContent>

          {/* PRICING TAB */}
          <TabsContent value="pricing" className="space-y-3 mt-3">
            {services.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.duration}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rs</span>
                      <Input
                        type="number"
                        defaultValue={s.price}
                        className="w-24 h-8 text-sm"
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0 && val !== s.price) {
                            updateServicePrice(s.id, val);
                          }
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={!!selectedBooking} onOpenChange={v => { if (!v) setSelectedBooking(null); }}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>بکنگ کی تفصیل</DialogTitle></DialogHeader>{bookings.find(b => b.id === selectedBooking) && <ServiceJobPanel booking={bookings.find(b => b.id === selectedBooking)} mode="staff" onChanged={() => void fetchAllData(categories.map(c => c.id))}/>}</DialogContent></Dialog>
    </div>
  );
};

export default ServiceManagerDashboard;
