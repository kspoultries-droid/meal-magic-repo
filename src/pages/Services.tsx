import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search, Star, Clock, ChevronRight, AirVent, Wrench, Zap,
  Sparkles, Paintbrush, Hammer, ArrowLeft, Calendar, MapPin, CreditCard, Car
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import HelplineSection from "@/components/services/HelplineSection";
import FeedbackDialog from "@/components/services/FeedbackDialog";
import PromotionalAds from "@/components/PromotionalAds";

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
  const [carModel, setCarModel] = useState("");
  const [oilCompany, setOilCompany] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      let query = supabase.from("services").select("*, service_categories(name)");
      if (activeCategory) query = query.eq("category_id", activeCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      const { data } = await query.order("is_active", { ascending: false }).order("created_at", { ascending: false });
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

  useEffect(() => {
    if (user) fetchMyBookings();
  }, [user]);

  const advanceFee = selectedService ? Math.round(selectedService.price * 0.15) : 0;

  const isOilChange = selectedService?.name?.toLowerCase().includes("oil change") || selectedService?.name?.includes("آئل چینج");
  const isCarService = categories.find(c => c.id === selectedService?.category_id)?.name?.toLowerCase().includes("car");

  const handleBook = async () => {
    if (!user) {
      toast.error("Please login first / پہلے لاگ ان کریں");
      navigate("/auth");
      return;
    }
    if (!bookingDate || !bookingTime || !bookingAddress.trim()) {
      toast.error("Fill all fields / تمام فیلڈز بھریں");
      return;
    }
    if (isOilChange && (!carModel || !oilCompany)) {
      toast.error("Car model aur oil company select karein / گاڑی کا ماڈل اور آئل کمپنی منتخب کریں");
      return;
    }
    setSubmitting(true);
    const carInfo = isOilChange ? `Car: ${carModel} | Oil: ${oilCompany}` : isCarService && carModel ? `Car: ${carModel}` : "";
    const fullNotes = [carInfo, bookingNotes].filter(Boolean).join(" | ");
    const { error } = await supabase.from("service_bookings").insert({
      service_id: selectedService.id,
      customer_id: user.id,
      address: bookingAddress,
      scheduled_date: bookingDate,
      scheduled_time: bookingTime,
      notes: fullNotes || null,
      total_amount: selectedService.price,
      advance_fee: advanceFee,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Booking failed / بکنگ میں مسئلہ آیا");
      console.error(error);
    } else {
      toast.success("Booking successful! Advance fee: Rs " + advanceFee + " / بکنگ کامیاب! ایڈوانس فیس: Rs " + advanceFee + " ✅");
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setCarModel("");
      setOilCompany("");
    }
  };

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Header */}
      <div className="bg-primary pt-4 pb-8 px-4">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Home Services / ہوم سروسز</h1>
        <p className="text-primary-foreground/70 text-sm mb-4">Professional services at your doorstep / پروفیشنل سروسز آپ کی دہلیز پر 🏠</p>
        <div className="flex bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 flex-1 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services / سروس تلاش کریں..."
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* Promotional Ads */}
      <PromotionalAds placement="home" />

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Categories / کیٹیگریز</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Wrench;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(isActive ? null : cat.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isActive ? "bg-primary/10 border-primary shadow-md scale-105" : "bg-card hover:shadow-md"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl ${cat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-foreground text-center">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="container mx-auto px-4 pb-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">
          {activeCategory
            ? `${categories.find((c) => c.id === activeCategory)?.name || ""} Services / سروسز`
            : "All Services / تمام سروسز"}
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
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => service.is_active && setSelectedService(service)}
                className={`w-full flex items-center gap-4 rounded-2xl p-4 border transition-shadow text-left ${
                  service.is_active 
                    ? "bg-card hover:shadow-md" 
                    : "bg-muted/50 opacity-75 cursor-default"
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
                  service.is_active ? "bg-secondary" : "bg-muted"
                }`}>
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.name} className={`w-full h-full object-cover ${!service.is_active ? "grayscale" : ""}`} />
                  ) : (
                    <Wrench className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground truncate">{service.name}</h3>
                    {!service.is_active && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        🔄 جلد آ رہا ہے
                      </span>
                    )}
                  </div>
                  {service.is_active ? (
                    service.description && (
                      <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">Coming Soon — اپ ڈیٹ ہو رہی ہے ⏳</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" /> {service.rating || "New / نیا"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {service.duration}
                    </span>
                  </div>
                  <span className={`text-sm font-extrabold ${service.is_active ? "text-primary" : "text-muted-foreground"}`}>Rs {service.price}</span>
                </div>
                {service.is_active ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

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
                  <p className="font-bold text-foreground text-sm">{b.services?.name || "Service / سروس"}</p>
                  <p className="text-xs text-muted-foreground">{b.scheduled_date}</p>
                </div>
                <span className="text-xs font-bold text-primary">Rate Now / ریٹنگ دیں →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helpline */}
      <HelplineSection />

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={!!feedbackBooking}
        onOpenChange={() => setFeedbackBooking(null)}
        booking={feedbackBooking}
        onSuccess={fetchMyBookings}
      />

      {/* Booking Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Book Now / بکنگ کریں</DialogTitle>
            <DialogDescription>{selectedService?.name}</DialogDescription>
          </DialogHeader>

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

              {/* Car Model Selection - for car services */}
              {isCarService && (
                <div>
                  <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                    <Car className="w-4 h-4" /> Car Model / گاڑی کا ماڈل {isOilChange && <span className="text-destructive">*</span>}
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
                  placeholder="Enter full address / مکمل پتہ لکھیں..."
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
                  placeholder="Special instructions / کوئی خاص ہدایت..."
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
                {submitting ? "Booking... / بکنگ ہو رہی ہے..." : `Book Now — Total Rs ${selectedService.price} (Advance Rs ${advanceFee})`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CartDrawer />
      <AppShareButton section="services" />
      <BottomTabBar />
    </div>
  );
};

export default Services;
