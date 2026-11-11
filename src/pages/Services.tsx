import { displayText } from "@/lib/i18n/displayText";
import { tr } from "@/lib/i18n/tr";
import { img } from "@/lib/imageUrl";
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
import ServiceJobPanel from "@/components/services/ServiceJobPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PromotionalAds from "@/components/PromotionalAds";
import HeroEditor from "@/components/common/HeroEditor";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { servicesHeroDefaults, heroBackgroundStyle } from "@/lib/heroConfig";
import { getStoredCityId } from "@/hooks/useCityServices";

const iconMap: Record<string, any> = {
  AirVent, Wrench, Zap, Sparkles, Paintbrush, Hammer, Car,
};

const CAR_MODELS = [
  "Toyota Corolla", "Toyota Yaris", "Toyota Vitz", "Honda Civic", "Honda City",
  "Honda Vezel", "Suzuki Alto", "Suzuki Cultus", "Suzuki WagonR", "Suzuki Swift",
  "Suzuki Mehran", "Hyundai Tucson", "Hyundai Elantra", "KIA Sportage", "KIA Picanto",
  "Changan Alsvin", "MG HS", "MG ZS", tr("Other", "Other / دوسری")
];

const OIL_COMPANIES = [
  "Shell Helix", "Castrol", "Mobil 1", "Total Quartz", "ZIC",
  "Havoline", "Toyota Genuine", "Honda Genuine", tr("Other", "Other / دوسری")
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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [carModel, setCarModel] = useState("");
  const [oilCompany, setOilCompany] = useState("");
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { config: heroConfig, loaded: heroLoaded, save: saveHero } = useHeroSettings("hero_services", servicesHeroDefaults);
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
      const cityId = getStoredCityId();
      if (cityId) query = query.or(`city_id.eq.${cityId},city_id.is.null`);
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
          toast.success(tr("✅ Your booking is confirmed!", "✅ آپ کی بکنگ تصدیق شدہ ہے! / Your booking is confirmed!"));
        } else if (newStatus === 'completed') {
          toast.success(tr("🎉 Service completed!", "🎉 سروس مکمل ہو گئی! / Service completed!"));
        } else if (newStatus === 'cancelled') {
          toast.error(tr("❌ Booking cancelled", "❌ بکنگ منسوخ ہو گئی / Booking cancelled"));
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
      .filter((p: any) => p.is_available && (!getStoredCityId() || !p.city_id || p.city_id === getStoredCityId()))
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


  const isOilChange = selectedService?.name?.toLowerCase().includes("oil change") || selectedService?.name?.includes(tr("Oil Change", "آئل چینج"));
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
    const { data: bookingId, error } = await supabase.rpc("create_service_booking", {
      _service_id: selectedService.id,
      _address: bookingAddress,
      _scheduled_date: bookingDate,
      _scheduled_time: bookingTime,
      _notes: fullNotes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || t("services.bookingFailed"));
      console.error(error);
    } else {
      toast.success(tr("Booking Saved", "بکنگ محفوظ ہو گئی / Booking saved"));
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setCarModel("");
      setOilCompany("");
      fetchAllBookings();
      if (bookingId) navigate(`/order-tracking/${bookingId}`);
    }
  };

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <Navbar />

      {/* Header - editable premium hero */}
      {!heroLoaded ? (
        <div aria-busy="true" aria-label={tr("Home Services", "ہوم سروسز")} className="min-h-[150px] bg-muted" />
      ) : <div className="relative overflow-hidden px-4 py-4 rounded-b-3xl" style={heroBackgroundStyle(heroConfig)}>
        <div className="relative">
          {isAdmin && (
            <div className="mb-2 flex justify-end">
              <HeroEditor config={heroConfig} defaults={servicesHeroDefaults} onSave={saveHero} />
            </div>
          )}
          <div style={{ textAlign: heroConfig.align }}>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: heroConfig.accentColor }}>{displayText(heroConfig.eyebrow)}</p>
            <h1 className="break-words font-extrabold leading-snug" style={{ fontSize: heroConfig.titleSize }}>{displayText(heroConfig.title)}</h1>
            <p className="text-xs opacity-80 mb-3">{displayText(heroConfig.subtitle)}</p>
          </div>
          {heroConfig.showBadges && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              {[heroConfig.badge1, heroConfig.badge2, heroConfig.badge3].filter(Boolean).map((badge) => (
                <span key={displayText(badge)} className="rounded-full bg-card/85 px-2.5 py-1 text-foreground shadow-sm">{displayText(badge)}</span>
              ))}
            </div>
          )}
        </div>
      </div>}

      <div className="container mx-auto px-4 pt-3">
          <div className="flex h-12 min-w-0 items-center gap-3 rounded-full border border-border bg-card px-4 shadow-soft focus-within:ring-2 focus-within:ring-ring">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={displayText(heroConfig.searchPlaceholder)}
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
      </div>

      {/* Promotional Ads - hide when category selected */}
      {!activeCategory && <PromotionalAds placement="home" />}

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-3">
        {!activeCategory && <h2 className="text-lg font-extrabold text-foreground mb-3">{tr("Categories", "Categories / کیٹیگریز")}</h2>}
        <div className={`grid gap-2 ${activeCategory ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-8"}`}>
          {/* All button */}
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-card hover:shadow-sm transition-all"
            >
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[8px] font-semibold text-muted-foreground text-center leading-tight">{tr("All", "All / سب")}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex min-h-24 flex-col items-center justify-start gap-2 p-2.5 rounded-lg border transition-all ${
                !activeCategory ? "bg-accent border-primary shadow-soft" : "bg-card hover:shadow-card"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground text-center leading-tight">{tr("All", "All / سب")}</span>
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
                    <img src={img(cat.image_url, 360)} alt={displayText(cat.name)} className="w-5 h-5 object-cover rounded" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="w-full line-clamp-2 text-[10px] font-semibold text-muted-foreground text-center leading-5">{displayText(cat.name)}</span>
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
                className={`flex min-h-24 min-w-0 flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all ${
                  !cat.is_active
                    ? "bg-muted/50 opacity-60 grayscale cursor-default"
                    : isActive 
                      ? "bg-accent border-primary shadow-soft col-span-2" 
                      : "bg-card hover:shadow-card"
                }`}
              >
              <div className={`w-9 h-9 rounded-xl ${cat.color} flex items-center justify-center overflow-hidden`}>
                  {cat.image_url ? (
                    <img src={img(cat.image_url, 360)} alt={displayText(cat.name)} className={`w-full h-full object-cover ${!cat.is_active ? "grayscale" : ""}`} />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="w-full break-words text-[10px] font-bold text-foreground text-center leading-5">{displayText(cat.name)}</span>
                {!cat.is_active && (
                  <span className="text-[7px] font-bold text-muted-foreground">{tr("Coming Soon", "جلد آ رہا ہے")}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="container mx-auto px-4 pb-4">
        <h2 ref={servicesRef} className="text-lg font-extrabold text-foreground mb-3 scroll-mt-24">
          {activeCategory
            ? `${displayText(categories.find((c) => c.id === activeCategory)?.name)} ${tr("Services", "سروسز")}`
            : t("services.all")}
        </h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">{tr("Loading...", "Loading... / لوڈ ہو رہا ہے...")}</p>
        ) : services.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <Wrench className="w-12 h-12 text-primary-foreground mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-primary-foreground mb-1">{tr("Coming Soon!", "Coming Soon! / جلد آ رہا ہے!")}</h3>
            <p className="text-primary-foreground/80 text-sm">{tr("No services in this category yet", "No services in this category yet / اس کیٹیگری میں ابھی کوئی سروس نہیں")}</p>
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
                      <h3 className="text-sm font-extrabold text-primary">{displayText(categoryName)}</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <button
                  key={service.id}
                  onClick={() => effectivelyActive && setSelectedService(service)}
                  className={`w-full flex items-center gap-3 rounded-lg p-3 border transition-shadow text-start animate-fade-in ${
                    effectivelyActive 
                      ? "bg-card hover:shadow-md" 
                      : "bg-muted/50 opacity-75 cursor-default"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
                    effectivelyActive ? "bg-secondary" : "bg-muted"
                  }`}>
                    {service.image_url ? (
                      <img loading="lazy" decoding="async" src={img(service.image_url, 160)} alt={displayText(service.name)} className={`w-full h-full object-cover ${!effectivelyActive ? "grayscale" : ""}`} />
                    ) : (
                      <Wrench className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-bold text-foreground">{displayText(service.name)}</h3>
                      {!effectivelyActive && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                          {tr("🔄 Coming Soon", "🔄 جلد آ رہا ہے")}
                        </span>
                      )}
                    </div>
                    {effectivelyActive ? (
                      service.description && (
                        <p className="text-xs text-muted-foreground truncate">{displayText(service.description)}</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">{tr("Coming Soon — Updating ⏳", "Coming Soon — اپ ڈیٹ ہو رہی ہے ⏳")}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-warning" /> {service.rating || t("services.new")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {displayText(service.duration)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <span className={`text-sm font-extrabold ${effectivelyActive ? "text-primary" : "text-muted-foreground"}`}>Rs {service.price}</span>
                      {effectivelyActive && (
                        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                          {tr("Book Now →", "Book Now / بکنگ کریں →")}
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

      {/* My bookings shortcut — full details live in My Orders */}
      {user && allBookings.length > 0 && (
        <div className="container mx-auto px-4 pb-6">
          <button
            onClick={() => navigate("/my-orders")}
            className="w-full flex items-center gap-3 rounded-2xl border bg-card p-4 text-start shadow-soft"
          >
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{tr("My bookings", "میری بکنگز")}</p>
              <p className="text-xs text-muted-foreground">
                {allBookings.filter(b => !["completed", "cancelled"].includes(b.status)).length} {tr("active", "جاری")}
                {myBookings.length > 0 && ` · ${tr("rate completed work", "مکمل کام کی ریٹنگ دیں")}`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Nearby Service Providers / قریبی سروس پرووائیڈرز */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> {tr("Nearby Helpers", "Nearby Helpers / قریبی ہیلپرز")}
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
              {tr("No helpers available yet", "ابھی کوئی ہیلپر دستیاب نہیں / No helpers available yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyProviders.map((provider) => (
              <div key={provider.id} className="bg-card rounded-2xl p-4 border flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {provider.image_url ? (
                    <img src={img(provider.image_url, 360)} alt={provider.name} className="w-full h-full object-cover" />
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
      <Dialog open={!!selectedBookingId} onOpenChange={(open) => { if (!open) setSelectedBookingId(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tr("Booking Details", "بکنگ کی تفصیل / Booking details")}</DialogTitle></DialogHeader>
          {allBookings.find(b => b.id === selectedBookingId) && <ServiceJobPanel booking={allBookings.find(b => b.id === selectedBookingId)} mode="customer" onChanged={fetchAllBookings} />}
        </DialogContent>
      </Dialog>
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
            <DrawerTitle className="text-lg font-extrabold">{tr("Book Now", "Book Now / بکنگ کریں")}</DrawerTitle>
            <DrawerDescription>{selectedService?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">

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
                  <p className="font-bold text-blue-700 mb-1">{tr("🏪 Station Visit", "🏪 Station Visit / سٹیشن وزٹ")}</p>
                  <p className="text-blue-600 text-xs">{tr("Book an appointment and bring your car to the service station", "Appointment lein aur gaari service station par le kr aaein / اپائنٹمنٹ لیں اور گاڑی سروس سٹیشن پر لے کر آئیں")}</p>
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
                    <option value="">{tr("Select Car...", "Select Car / گاڑی منتخب کریں...")}</option>
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
                    {tr("🛢️ Oil Company", "🛢️ Oil Company / آئل کمپنی")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={oilCompany}
                    onChange={(e) => setOilCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                  >
                    <option value="">{tr("Select Oil...", "Select Oil / آئل منتخب کریں...")}</option>
                    {OIL_COMPANIES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> {tr("Select Date", "Select Date / تاریخ منتخب کریں")}
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
                  <Clock className="w-4 h-4" /> {tr("Select Time", "Select Time / وقت منتخب کریں")}
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
                  <MapPin className="w-4 h-4" /> {tr("Address", "Address / پتہ")}
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
                <label className="text-sm font-bold text-foreground mb-1 block">{tr("Notes (Optional)", "Notes (Optional) / نوٹس (اختیاری)")}</label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={t("services.notesPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                />
              </div>

              {/* Payment Info */}
              <div className="bg-secondary rounded-xl p-3 flex items-start gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">{tr("No advance — pay after the work", "کوئی ایڈوانس نہیں — کام کے بعد ادائیگی")}</p>
                  <p className="text-xs text-muted-foreground">{tr("Pay the helper in cash when the job is done. If extra parts are needed, you will get a price to approve first.", "کام مکمل ہونے پر کاریگر کو نقد ادائیگی کریں۔ اضافی سامان لگے تو پہلے آپ کو قیمت منظوری کے لیے بھیجی جائے گی۔")}</p>
                </div>
              </div>

              {/* Book Button */}
              <Button
                className="w-full min-h-12 h-auto whitespace-normal py-3 text-sm font-extrabold rounded-lg"
                onClick={handleBook}
                disabled={submitting}
              >
                {submitting ? t("services.booking") : `${tr("Confirm booking", "بکنگ کنفرم کریں")} — Rs ${selectedService.price}`}
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
