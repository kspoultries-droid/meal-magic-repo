import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search, Star, Clock, ChevronRight, AirVent, Wrench, Zap,
  Sparkles, Paintbrush, Hammer, ArrowLeft, Calendar, MapPin, CreditCard
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

const iconMap: Record<string, any> = {
  AirVent, Wrench, Zap, Sparkles, Paintbrush, Hammer,
};

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
      let query = supabase.from("services").select("*, service_categories(name)").eq("is_active", true);
      if (activeCategory) query = query.eq("category_id", activeCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      const { data } = await query.order("created_at", { ascending: false });
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

  const handleBook = async () => {
    if (!user) {
      toast.error("پہلے لاگ ان کریں");
      navigate("/auth");
      return;
    }
    if (!bookingDate || !bookingTime || !bookingAddress.trim()) {
      toast.error("تمام فیلڈز بھریں");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("service_bookings").insert({
      service_id: selectedService.id,
      customer_id: user.id,
      address: bookingAddress,
      scheduled_date: bookingDate,
      scheduled_time: bookingTime,
      notes: bookingNotes,
      total_amount: selectedService.price,
    });
    setSubmitting(false);
    if (error) {
      toast.error("بکنگ میں مسئلہ آیا");
      console.error(error);
    } else {
      toast.success("بکنگ کامیاب! ✅ جلد آپ سے رابطہ کیا جائے گا");
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
    }
  };

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Header */}
      <div className="bg-primary pt-4 pb-8 px-4">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Home Services</h1>
        <p className="text-primary-foreground/70 text-sm mb-4">پروفیشنل سروسز آپ کی دہلیز پر 🏠</p>
        <div className="flex bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 flex-1 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="سروس تلاش کریں..."
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">کیٹیگریز</h2>
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
                <span className="text-xs font-bold text-foreground">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="container mx-auto px-4 pb-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">
          {activeCategory
            ? `${categories.find((c) => c.id === activeCategory)?.name || ""} سروسز`
            : "تمام سروسز"}
        </h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">لوڈ ہو رہا ہے...</p>
        ) : services.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <Wrench className="w-12 h-12 text-primary-foreground mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-primary-foreground mb-1">جلد آ رہا ہے!</h3>
            <p className="text-primary-foreground/80 text-sm">اس کیٹیگری میں ابھی کوئی سروس نہیں</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <Wrench className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{service.name}</h3>
                  {service.description && (
                    <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" /> {service.rating || "New"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {service.duration}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-primary">Rs {service.price}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">بکنگ کریں</DialogTitle>
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

              {/* Date */}
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> تاریخ منتخب کریں
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
                  <Clock className="w-4 h-4" /> وقت منتخب کریں
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
                  <MapPin className="w-4 h-4" /> پتہ
                </label>
                <textarea
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="مکمل پتہ لکھیں..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-foreground mb-1 block">نوٹس (اختیاری)</label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="کوئی خاص ہدایت..."
                  className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                />
              </div>

              {/* Payment Info */}
              <div className="bg-secondary rounded-xl p-3 flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">ادائیگی: کام مکمل ہونے پر (COD)</span>
              </div>

              {/* Book Button */}
              <Button
                className="w-full h-12 text-base font-extrabold rounded-xl"
                onClick={handleBook}
                disabled={submitting}
              >
                {submitting ? "بکنگ ہو رہی ہے..." : `بک کریں — Rs ${selectedService.price}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default Services;
