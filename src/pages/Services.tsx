import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search, Star, Clock, ChevronRight, AirVent, Wrench, Zap,
  Sparkles, Paintbrush, Hammer, ArrowLeft, Calendar, MapPin, CreditCard, Car,
  LocateFixed, Users
} from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from "@/components/ui/drawer";
import HelplineSection from "@/components/services/HelplineSection";
import FeedbackDialog from "@/components/services/FeedbackDialog";
import PromotionalAds from "@/components/PromotionalAds";
import HeroEditor from "@/components/common/HeroEditor";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { servicesHeroDefaults, heroBackgroundStyle } from "@/lib/heroConfig";

const iconMap: Record<string, any> = {
  AirVent, Wrench, Zap, Sparkles, Paintbrush, Hammer, Car,
};

const CAR_MODELS = [
  "Toyota Corolla", "Toyota Yaris", "Toyota Vitz", "Honda Civic", "Honda City",
  "Honda Vezel", "Suzuki Alto", "Suzuki Cultus", "Suzuki WagonR", "Suzuki Swift",
  "Suzuki Mehran", "Hyundai Tucson", "Hyundai Elantra", "KIA Sportage", "KIA Picanto",
  "Changan Alsvin", "MG HS", "MG ZS", "Other / دوسری"
];

const OIL_COMPANIES = [
  "Shell Helix", "Castrol", "Mobil 1", "Total Quartz", "ZIC",
  "Havoline", "Toyota Genuine", "Honda Genuine", "Other / دوسری"
];

const Services = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackBooking, setFeedbackBooking] = useState<any>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [carModel, setCarModel] = useState("");
  const [oilCompany, setOilCompany] = useState("");
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { config: heroConfig, save: saveHero } = useHeroSettings("hero_services", servicesHeroDefaults);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("*")
        .order("is_active", { ascending: false })
        .order("sort_order");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      let query = supabase.from("services").select("*, service_categories(name, is_active)");
      if (activeCategory) query = query.eq("category_id", activeCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      const { data } = await query.order("is_active", { ascending: false }).order("category_id").order("sort_order").order("created_at", { ascending: false });
      setServices(data || []);
      setLoading(false);
    };
    fetchServices();
  }, [activeCategory, searchQuery]);

  // Pre-fill address from profile
  useEffect(() => {
    if (user && selectedService) {
      supabase.from("profiles").select("address").eq("id", user.id).single().then(({ data }) => {
        if (data?.address) setBookingAddress(data.address);
      });
    }
  }, [user, selectedService]);

  // Fetch completed bookings for feedback
  const fetchMyBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_bookings")
      .select("*, services(name)")
      .eq("customer_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    setMyBookings(data || []);
  };

  // Fetch ALL bookings for appointments view
  const fetchAllBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_bookings")
      .select("*, services(name)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setAllBookings(data || []);
  };

  useEffect(() => {
    if (user) {
      fetchMyBookings();
      fetchAllBookings();
    }
  }, [user]);

  // Realtime: listen for booking status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('my-bookings')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_bookings',
        filter: `customer_id=eq.${user.id}`,
      }, (payload) => {
        const newStatus = payload.new?.status;
        if (newStatus === 'confirmed') {
          toast.success("✅ آپ کی بکنگ تصدیق شدہ ہے! / Your booking is confirmed!");
        } else if (newStatus === 'completed') {
          toast.success("🎉 سروس مکمل ہو گئی! / Service completed!");
        } else if (newStatus === 'cancelled') {
          toast.error("❌ بکنگ منسوخ ہو گئی / Booking cancelled");
        }
        fetchAllBookings();
        fetchMyBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch nearby providers (phone numbers are never exposed in public listing)
  const fetchNearbyProviders = async (catId?: string | null) => {
    let rows: any[] = [];

    const { data: session } = await supabase.auth.getSession();
    if (session?.session) {
      const { data } = await supabase.rpc("list_public_service_providers", {
        _category_id: catId ?? null,
      });
      rows = (data as any[]) || [];
    } else {
      // Signed-out visitors read the curated public view (no phone / exact location)
      let q = supabase
        .from("service_providers_public" as any)
        .select("id,name,category_id,category_name,city_id,latitude,longitude,address,rating,total_reviews,is_available,is_active,bio,image_url")
        .order("rating", { ascending: false, nullsFirst: false });
      if (catId) q = q.eq("category_id", catId);
      const { data } = await q;
      rows = (data as any[]) || [];
    }

    let providers: any[] = rows
      .filter((p: any) => p.is_available)
      .slice(0, 20)
      .map((p: any) => ({ ...p, service_categories: { name: p.category_name } }));

    // Sort by distance if user location available
    if (userLocation && providers.length > 0) {
      providers = providers
        .map(p => ({
          ...p,
          distance: p.latitude && p.longitude
            ? getDistanceKm(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
            : 999,
        }))
        .sort((a, b) => a.distance - b.distance);
    }
    setNearbyProviders(providers);
  };


  // Haversine distance
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocatingUser(false);
        toast.success("📍 " + t("services.locationFound"));
      },
      () => {
        setLocatingUser(false);
        toast.error(t("services.locationFailed"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchNearbyProviders(activeCategory);
  }, [activeCategory, userLocation]);

  const advanceFee = selectedService ? Math.round(selectedService.price * 0.15) : 0;

  const isOilChange = selectedService?.name?.toLowerCase().includes("oil change") || selectedService?.name?.includes("آئل چینج");
  const isCarService = categories.find(c => c.id === selectedService?.category_id)?.name?.toLowerCase().includes("car");

  const handleBook = async () => {
    if (!user) {
      toast.error(t("services.loginFirst"));
      navigate("/auth");
      return;
    }
    if (!bookingDate || !bookingTime || !bookingAddress.trim()) {
      toast.error(t("services.fillFields"));
      return;
    }
    if (isOilChange && (!carModel || !oilCompany)) {
      toast.error(t("services.selectCarOil"));
      return;
    }
    setSubmitting(true);
    const carInfo = isOilChange ? `Car: ${carModel} | Oil: ${oilCompany}` : isCarService && carModel ? `Car: ${carModel}` : "";
    const fullNotes = [carInfo, bookingNotes].filter(Boolean).join(" | ");
    const { error } = await supabase.rpc("create_service_booking", {
      _service_id: selectedService.id,
      _address: bookingAddress,
      _scheduled_date: bookingDate,
      _scheduled_time: bookingTime,
      _notes: fullNotes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("services.bookingFailed"));
      console.error(error);
    } else {
      toast.success("Booking successful! Advance fee: Rs " + advanceFee + " / بکنگ کامیاب! ایڈوانس فیس: Rs " + advanceFee + " ✅");
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setCarModel("");
      setOilCompany("");
      fetchAllBookings();
    }
  };

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Header - editable premium hero */}
      <div className="relative overflow-hidden px-4" style={heroBackgroundStyle(heroConfig)}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-foreground/5 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-foreground/5 blur-3xl" />
        <div className="relative">
          {isAdmin && (
            <div className="mb-2 flex justify-end">
              <HeroEditor config={heroConfig} defaults={servicesHeroDefaults} onSave={saveHero} />
            </div>
          )}
          <div style={{ textAlign: heroConfig.align }}>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: heroConfig.accentColor }}>{heroConfig.eyebrow}</p>
            <h1 className="font-extrabold tracking-tight leading-tight" style={{ fontSize: heroConfig.titleSize }}>{heroConfig.title}</h1>
            <p className="text-xs opacity-80 mb-3">{heroConfig.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 bg-card/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl ring-1 ring-foreground/10">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={heroConfig.searchPlaceholder}
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
          {heroConfig.showBadges && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              {[heroConfig.badge1, heroConfig.badge2, heroConfig.badge3].filter(Boolean).map((badge) => (
                <span key={badge} className="rounded-full bg-card/85 px-2.5 py-1 text-foreground shadow-sm">{badge}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Promotional Ads - hide when category selected */}
      {!activeCategory && <PromotionalAds placement="home" />}

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-3">
        {!activeCategory && <h2 className="text-lg font-extrabold text-foreground mb-3">Categories / کیٹیگریز</h2>}
        <div className={`grid gap-2 ${activeCategory ? "grid-cols-6" : "grid-cols-4"}`}>
          {/* All button */}
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-card hover:shadow-sm transition-all"
            >
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[8px] font-semibold text-muted-foreground text-center leading-tight">All / سب</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                !activeCategory ? "bg-primary/10 border-primary shadow-md" : "bg-card hover:shadow-md"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground text-center leading-tight">All / سب</span>
            </button>
          )}
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Wrench;
            const isActive = activeCategory === cat.id;
            if (activeCategory && !isActive) {
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-card hover:shadow-sm transition-all"
                >
              {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-5 h-5 object-cover rounded" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[8px] font-semibold text-muted-foreground text-center leading-tight truncate w-full">{cat.name}</span>
                </button>
              );
            }
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (!cat.is_active) return; // Don't allow selecting inactive categories
                  setActiveCategory(isActive ? null : cat.id);
                  if (!isActive) {
                    setTimeout(() => servicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                  }
                }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                  !cat.is_active
                    ? "bg-muted/50 opacity-60 grayscale cursor-default"
                    : isActive 
                      ? "bg-primary/10 border-primary shadow-md col-span-2" 
                      : "bg-card hover:shadow-md"
                }`}
              >
              <div className={`w-9 h-9 rounded-xl ${cat.color} flex items-center justify-center overflow-hidden`}>
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className={`w-full h-full object-cover ${!cat.is_active ? "grayscale" : ""}`} />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-foreground text-center leading-tight">{cat.name}</span>
                {!cat.is_active && (
                  <span className="text-[7px] font-bold text-muted-foreground">جلد آ رہا ہے</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="container mx-auto px-4 pb-4">
        <h2 ref={servicesRef} className="text-lg font-extrabold text-foreground mb-3 scroll-mt-2">
          {activeCategory
            ? `${categories.find((c) => c.id === activeCategory)?.name || ""} Services / سروسز`
            : t("services.all")}
        </h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading... / لوڈ ہو رہا ہے...</p>
        ) : services.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <Wrench className="w-12 h-12 text-primary-foreground mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-primary-foreground mb-1">Coming Soon! / جلد آ رہا ہے!</h3>
            <p className="text-primary-foreground/80 text-sm">No services in this category yet / اس کیٹیگری میں ابھی کوئی سروس نہیں</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service, index) => {
              const showCategoryHeader = !activeCategory && (
                index === 0 || service.category_id !== services[index - 1]?.category_id
              );
              const parentCat = categories.find(c => c.id === service.category_id);
              const categoryName = parentCat?.name || service.service_categories?.name;
              const categoryActive = parentCat ? parentCat.is_active === true : true;
              const effectivelyActive = service.is_active === true && categoryActive;
              return (
                <div key={service.id}>
                  {showCategoryHeader && categoryName && (
                    <div className="flex items-center gap-2 pt-3 pb-1 first:pt-0">
                      <h3 className="text-sm font-extrabold text-primary">{categoryName}</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <button
                  key={service.id}
                  onClick={() => effectivelyActive && setSelectedService(service)}
                  className={`w-full flex items-center gap-4 rounded-2xl p-4 border transition-shadow text-left animate-fade-in ${
                    effectivelyActive 
                      ? "bg-card hover:shadow-md" 
                      : "bg-muted/50 opacity-75 cursor-default"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
                    effectivelyActive ? "bg-secondary" : "bg-muted"
                  }`}>
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className={`w-full h-full object-cover ${!effectivelyActive ? "grayscale" : ""}`} />
                    ) : (
                      <Wrench className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground truncate">{service.name}</h3>
                      {!effectivelyActive && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                          🔄 جلد آ رہا ہے
                        </span>
                      )}
                    </div>
                    {effectivelyActive ? (
                      service.description && (
                        <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">Coming Soon — اپ ڈیٹ ہو رہی ہے ⏳</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" /> {service.rating || t("services.new")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.duration}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm font-extrabold ${effectivelyActive ? "text-primary" : "text-muted-foreground"}`}>Rs {service.price}</span>
                      {effectivelyActive && (
                        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold animate-pulse">
                          Book Now / بکنگ کریں →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Appointments / میری اپائنٹمنٹس */}
      {user && allBookings.length > 0 && (
        <div className="container mx-auto px-4 pb-6">
          <h2 className="text-lg font-extrabold text-foreground mb-3">📋 My Appointments / میری اپائنٹمنٹس</h2>
          <div className="space-y-2">
            {allBookings.map((b) => {
              const statusMap: Record<string, { label: string; color: string; emoji: string }> = {
                pending: { label: t("services.statusPending"), color: "text-yellow-600 bg-yellow-50", emoji: "⏳" },
                confirmed: { label: t("services.statusConfirmed"), color: "text-green-600 bg-green-50", emoji: "✅" },
                in_progress: { label: t("services.statusInProgress"), color: "text-blue-600 bg-blue-50", emoji: "🔧" },
                completed: { label: t("services.statusCompleted"), color: "text-primary bg-primary/10", emoji: "🎉" },
                cancelled: { label: t("services.statusCancelled"), color: "text-destructive bg-destructive/10", emoji: "❌" },
              };
              const st = statusMap[b.status] || statusMap.pending;
              return (
                <div key={b.id} className="bg-card rounded-2xl p-4 border space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground text-sm">{b.services?.name || "Service"}</p>
                      <p className="text-xs text-muted-foreground">📅 {b.scheduled_date} — 🕐 {b.scheduled_time}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${st.color}`}>
                      {st.emoji} {st.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">📍 {b.address}</span>
                    <span className="font-extrabold text-primary">Rs {b.total_amount}</span>
                  </div>
                  {b.status === "confirmed" && (
                    <div className="bg-green-50 rounded-lg p-2 text-xs text-green-700 font-bold">
                      ✅ آپ کی بکنگ تصدیق شدہ ہے! سروس پرووائیڈر مقررہ وقت پر آئے گا۔
                    </div>
                  )}
                  {b.notes && (
                    <p className="text-[10px] text-muted-foreground">📝 {b.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Completed Bookings - Feedback */}
      {user && myBookings.length > 0 && (
        <div className="container mx-auto px-4 pb-6">
          <h2 className="text-xl font-extrabold text-foreground mb-4">Give Feedback / فیڈبیک دیں ⭐</h2>
          <div className="space-y-2">
            {myBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setFeedbackBooking(b)}
                className="w-full flex items-center justify-between bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow text-left"
              >
                <div>
                  <p className="font-bold text-foreground text-sm">{b.services?.name || t("services.service")}</p>
                  <p className="text-xs text-muted-foreground">{b.scheduled_date}</p>
                </div>
                <span className="text-xs font-bold text-primary">Rate Now / ریٹنگ دیں →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Service Providers / قریبی سروس پرووائیڈرز */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Nearby Helpers / قریبی ہیلپرز
          </h2>
          <button
            onClick={getUserLocation}
            disabled={locatingUser}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? "animate-spin" : ""}`} />
            {userLocation ? t("services.updateLocation") : t("services.locate")}
          </button>
        </div>

        {nearbyProviders.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">
              ابھی کوئی ہیلپر دستیاب نہیں / No helpers available yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyProviders.map((provider) => (
              <div key={provider.id} className="bg-card rounded-2xl p-4 border flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {provider.image_url ? (
                    <img src={provider.image_url} alt={provider.name} className="w-full h-full object-cover" />
                  ) : (
                    <Wrench className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm truncate">{provider.name}</p>
                    {provider.is_available && (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {provider.service_categories?.name || "General"}
                    {provider.bio && ` — ${provider.bio}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-foreground">{Number(provider.rating).toFixed(1)}</span>
                      <span className="text-muted-foreground">({provider.total_reviews})</span>
                    </span>
                    {provider.distance !== undefined && provider.distance < 999 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {provider.distance.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helpline */}
      <HelplineSection />

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={!!feedbackBooking}
        onOpenChange={() => setFeedbackBooking(null)}
        booking={feedbackBooking}
        onSuccess={fetchMyBookings}
      />

      {/* Booking Drawer */}
      <Drawer open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-extrabold">Book Now / بکنگ کریں</DrawerTitle>
            <DrawerDescription>{selectedService?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">

          {selectedService && (
            <div className="space-y-4">
              {/* Service Summary */}
              <div className="bg-secondary rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">{selectedService.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedService.duration}</p>
                </div>
                <span className="text-lg font-extrabold text-primary">Rs {selectedService.price}</span>
              </div>

              {/* Car Wash Station Note */}
              {selectedService?.name?.toLowerCase().includes("car wash") && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm border border-blue-200">
                  <p className="font-bold text-blue-700 mb-1">🏪 Station Visit / سٹیشن وزٹ</p>
                  <p className="text-blue-600 text-xs">Appointment lein aur gaari service station par le kr aaein / اپائنٹمنٹ لیں اور گاڑی سروس سٹیشن پر لے کر آئیں</p>
                </div>
              )}

              {/* Car Model Selection - for car services */}
              {isCarService && (
                <div>
                  <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                    <Car className="w-4 h-4" /> {t("services.carModel")} {isOilChange && <span className="text-destructive">*</span>}
                  </label>
                  <select
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                  >
                    <option value="">Select Car / گاڑی منتخب کریں...</option>
                    {CAR_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Oil Company Selection - only for oil change */}
              {isOilChange && (
                <div>
                  <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                    🛢️ Oil Company / آئل کمپنی <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={oilCompany}
                    onChange={(e) => setOilCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                  >
                    <option value="">Select Oil / آئل منتخب کریں...</option>
                    {OIL_COMPANIES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Select Date / تاریخ منتخب کریں
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                />
              </div>

              {/* Time Slots */}
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" /> Select Time / وقت منتخب کریں
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setBookingTime(slot)}
                      className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                        bookingTime === slot
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" /> Address / پتہ
                </label>
                <textarea
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder={t("services.addressPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-foreground mb-1 block">Notes (Optional) / نوٹس (اختیاری)</label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={t("services.notesPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                />
              </div>

              {/* Advance Fee Info */}
              <div className="bg-orange-50 rounded-xl p-3 text-sm">
                <p className="font-bold text-orange-700 mb-1">⚡ Advance Fee / ایڈوانس فیس (15%)</p>
                <div className="flex justify-between text-orange-600">
                  <span>Advance: Rs {advanceFee}</span>
                  <span>Remaining: Rs {selectedService.price - advanceFee}</span>
                </div>
                <p className="text-xs text-orange-500 mt-1">Remaining on completion / باقی کام مکمل ہونے پر</p>
              </div>

              {/* Payment Info */}
              <div className="bg-secondary rounded-xl p-3 flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Advance: Wallet/JazzCash | Remaining: COD</span>
              </div>

              {/* Book Button */}
              <Button
                className="w-full h-12 text-base font-extrabold rounded-xl"
                onClick={handleBook}
                disabled={submitting}
              >
                {submitting ? t("services.booking") : `Book Now — Total Rs ${selectedService.price} (Advance Rs ${advanceFee})`}
              </Button>
            </div>
          )}
          </div>
        </DrawerContent>
      </Drawer>

      <AppShareButton section="services" />
      <BottomTabBar />
    </div>
  );
};

export default Services;
