import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CreditCard, ShoppingBag, LocateFixed, Gift, User, Phone, Ticket, X, Truck, Scale, Route, Minus, Plus } from "lucide-react";
import { calculateCartWeight, formatDeliveryMode, formatFeeBreakdown, type DeliveryQuote } from "@/lib/deliveryPricing";
import Navbar from "@/components/Navbar";
import PromotionalAds from "@/components/PromotionalAds";
import LocationSheet from "@/components/location/LocationSheet";
import BoughtTogether from "@/components/checkout/BoughtTogether";
import { setStoredLocation } from "@/hooks/useDeliveryLocation";

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantDeliveryMode, setRestaurantDeliveryMode] = useState<string>("platform");
  const [storeType, setStoreType] = useState<string>("grocery");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [locSheetOpen, setLocSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Gift / receiver fields
  const [isGift, setIsGift] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Auto-fill address and city from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("address, city_id").eq("id", user.id).single().then(({ data }) => {
      if (data?.address) setAddress((a) => a || data.address);
      if (data?.city_id) setSelectedCity((c) => c || data.city_id);
    });
    supabase.from("user_addresses").select("*").eq("user_id", user.id)
      .order("is_default", { ascending: false }).limit(6)
      .then(({ data }) => {
        setSavedAddresses(data || []);
        const def = (data || []).find((a: any) => a.is_default) || (data || [])[0];
        if (def) {
          setAddress((prev) => prev || def.address);
          if (def.lat && def.lng) setCoords({ lat: def.lat, lng: def.lng });
        }
      });
  }, [user]);


  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      setCities(data || []);
      if (data?.length) setSelectedCity((prev) => prev || data[0].id);
    });
  }, []);

  // Food and local grocery use the shop's city; wholesale may choose a destination city.
  useEffect(() => {
    const sourceId = items[0]?.sourceId;
    if (!sourceId) return;
    const isRest = items.every((i) => (i.source || "restaurant") === "restaurant");
    const q = isRest
      ? supabase.from("restaurants").select("city_id").eq("id", sourceId).maybeSingle()
      : supabase.from("grocery_stores").select("city_id, store_type").eq("id", sourceId).maybeSingle();
    q.then(({ data }) => {
      if ((data as any)?.city_id && (isRest || (data as any)?.store_type !== "wholesale")) setSelectedCity((c) => c || (data as any).city_id);
      setStoreType(isRest ? "restaurant" : ((data as any)?.store_type || "grocery"));
    });
  }, [items]);


  const [vendorPaysDelivery, setVendorPaysDelivery] = useState(false);

  useEffect(() => {
    const sourceId = items[0]?.sourceId;
    const isFood = items.every((item) => (item.source || "restaurant") === "restaurant");
    const isGrocery = items.every((item) => item.source === "grocery");
    if (!sourceId || !selectedCity || items.length === 0 || (!isFood && !isGrocery)) return;
    let cancelled = false;
    const totalWeight = calculateCartWeight(items);
    setQuoteLoading(true);
    (supabase.rpc as any)("quote_delivery", {
      _store_kind: isFood ? "food" : "grocery",
      _store_id: sourceId,
      _city_id: selectedCity,
      _lat: coords?.lat ?? null,
      _lng: coords?.lng ?? null,
      _weight_kg: totalWeight,
      _subtotal: totalPrice,
    }).then(({ data, error }: { data: DeliveryQuote | null; error: any }) => {
      if (cancelled) return;
      const city = cities.find((value) => value.id === selectedCity);
      if (error || !data) {
        const fallback = city?.delivery_fee || 0;
        setDeliveryQuote(null);
        setDeliveryFee(restaurantDeliveryMode === "self" || vendorPaysDelivery ? 0 : fallback);
      } else {
        setDeliveryQuote(data);
        setDeliveryFee(restaurantDeliveryMode === "self" || vendorPaysDelivery ? 0 : Number(data.fee || 0));
      }
      setQuoteLoading(false);
    });
    return () => { cancelled = true; };
  }, [items, selectedCity, coords, cities, totalPrice, restaurantDeliveryMode, vendorPaysDelivery]);

  // Detect restaurant delivery mode
  useEffect(() => {
    const isRest = items.length > 0 && items.every(i => (i.source || "restaurant") === "restaurant");
    if (!isRest) { setRestaurantDeliveryMode("platform"); return; }
    const rid = items[0]?.sourceId;
    if (!rid) return;
    supabase.from("restaurants").select("delivery_mode").eq("id", rid).maybeSingle()
      .then(({ data }) => setRestaurantDeliveryMode(data?.delivery_mode || "platform"));
  }, [items]);

  // Vendor-funded (free) delivery
  useEffect(() => {
    const sourceId = items[0]?.sourceId;
    if (!sourceId || items.length === 0) { setVendorPaysDelivery(false); return; }
    const isRest = items.every((i) => (i.source || "restaurant") === "restaurant");
    const q = isRest
      ? supabase.from("restaurants").select("pays_delivery_fee").eq("id", sourceId).maybeSingle()
      : supabase.from("grocery_stores").select("pays_delivery_fee").eq("id", sourceId).maybeSingle();
    q.then(({ data }) => setVendorPaysDelivery(Boolean((data as any)?.pays_delivery_fee)));
  }, [items]);


  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        // Reverse geocode using free API
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ur`);
          const data = await res.json();
          if (data.display_name) {
            setAddress(data.display_name);
            toast.success("لوکیشن مل گئی! 📍");
          }
        } catch {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success("لوکیشن سیٹ ہو گئی");
        }
        setLocating(false);
      },
      (err) => {
        toast.error("لوکیشن نہیں مل سکی — براؤزر میں اجازت دیں");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-bold">کارٹ خالی ہے</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>ریسٹورنٹ دیکھیں</Button>
        </div>
      </div>
    );
  }

  const isGroceryOrder = items.every(i => i.source === "grocery");
  const isRestaurantOrder = items.every(i => (i.source || "restaurant") === "restaurant");
  const isMixed = !isGroceryOrder && !isRestaurantOrder;

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setApplyingVoucher(true);
    const scope = isGroceryOrder ? "grocery" : "food";
    const { data, error } = await (supabase.rpc("validate_voucher" as any, {
      _code: voucherCode.trim(),
      _scope: scope,
      _subtotal: totalPrice,
    }) as any);
    setApplyingVoucher(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "واؤچر لاگو نہیں ہو سکا");
      setVoucher(null);
      return;
    }
    setVoucher({ code: data.code, discount: data.discount });
    toast.success(`واؤچر لاگو ہو گیا! Rs ${data.discount} رعایت 🎟️`);
  };

  const redeemVoucherOnOrder = async (kind: "food" | "grocery", orderId: string) => {
    if (!voucher) return;
    await (supabase.rpc("apply_voucher_to_order" as any, {
      _kind: kind,
      _order_id: orderId,
      _code: voucher.code,
    }) as any);
  };

  const placeOrder = async () => {
    if (isMixed) { toast.error("کارٹ میں مختلف شاپس کے آئٹمز ہیں — ایک شاپ کا آرڈر الگ سے دیں"); return; }
    if (!address.trim()) { toast.error("ڈلیوری ایڈریس درکار ہے"); return; }
    if (!selectedCity) { toast.error("ڈلیوری علاقہ دستیاب نہیں — تھوڑی دیر بعد کوشش کریں"); return; }
    if (isGift && !receiverPhone.trim()) { toast.error("وصول کنندہ کا فون نمبر درکار ہے"); return; }
    setSubmitting(true);

    if (saveThisAddress && user) {
      await supabase.from("user_addresses").insert({
        user_id: user.id,
        label: "میرا پتہ",
        address: address.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        is_default: savedAddresses.length === 0,
      });
    }

    try {
      if (isGroceryOrder) {
        const storeId = items[0]?.sourceId;
        if (!storeId) { toast.error("اسٹور کی معلومات نہیں ملیں"); setSubmitting(false); return; }
        const orderItems = items.map(item => ({
          id: item.menu_item_id,
          quantity: item.quantity,
          variant_id: item.variant_id || null,
          variant_label: item.variant_label || null,
        }));

        const { data: newId, error } = await supabase.rpc("create_grocery_cart_order", {
          _store_id: storeId,
          _city_id: selectedCity,
          _delivery_address: address,
          _notes: notes || null,
          _payment_method: paymentMethod,
          _items: orderItems,
          _receiver_name: isGift ? receiverName : null,
          _receiver_phone: isGift ? receiverPhone : null,
          _is_gift: isGift,
          _delivery_lat: coords?.lat || null,
          _delivery_lng: coords?.lng || null,
        });

        if (error) throw error;
        await redeemVoucherOnOrder("grocery", newId);
        toast.success(storeType === "wholesale" ? "بازار آرڈر کامیابی سے دیا گیا! 🎉" : "گروسری آرڈر کامیابی سے دیا گیا! 🛒🎉");
        clearCart();
        navigate(`/order-confirmation/grocery/${newId}`);
      } else {
        // Restaurant order — lookup by sourceId first, fallback to name
        let restaurantId = items[0]?.sourceId;
        if (!restaurantId) {
          const restaurantName = items[0]?.restaurant;
          const { data: restData } = await supabase.from("restaurants").select("id").eq("name", restaurantName).limit(1).maybeSingle();
          if (!restData) { toast.error("ریسٹورنٹ نہیں ملا — دوبارہ کارٹ سے آئٹم شامل کریں"); setSubmitting(false); return; }
          restaurantId = restData.id;
        }

        const menuItems = items.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          variant_id: item.variant_id || null,
          option_ids: item.option_ids || [],
          line_type: item.line_type || "main",
          choice_id: item.choice_id || null,
        }));

        const { data: orderId, error: orderError } = await supabase.rpc("create_order", {
          _restaurant_id: restaurantId,
          _city_id: selectedCity,
          _delivery_address: address,
          _notes: notes || "",
          _payment_method: paymentMethod,
          _menu_items: menuItems,
          _receiver_name: isGift ? receiverName : null,
          _receiver_phone: isGift ? receiverPhone : null,
          _is_gift: isGift,
          _delivery_lat: coords?.lat || null,
          _delivery_lng: coords?.lng || null,
        });

        if (orderError) throw orderError;
        await redeemVoucherOnOrder("food", orderId);
        toast.success("آرڈر کامیابی سے دیا گیا! 🎉");
        clearCart();
        navigate(`/order-confirmation/food/${orderId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "آرڈر میں مسئلہ آ گیا");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = Math.max(0, totalPrice + deliveryFee - (voucher?.discount || 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background pb-32">
      <Navbar />

      {/* Compact Hero Header */}
      <div className="bg-gradient-hero text-primary-foreground px-4 py-3 shadow-glow relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="container mx-auto max-w-2xl relative flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="واپس" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> چیک آؤٹ
            </h1>
            <p className="text-[11px] text-primary-foreground/80">{items.length} آئٹمز • Rs {grandTotal}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl mt-3 space-y-3">

        {/* Order Summary - Glass */}
        <div className="glass rounded-2xl p-4 border border-border/50 shadow-elegant animate-fade-in">
          <h2 className="text-sm font-extrabold text-foreground mb-2.5 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-gradient-primary rounded-full" /> آرڈر کی تفصیل
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm gap-2 rounded-lg bg-secondary/35 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-foreground/90 truncate">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></p>
                  {(item.variant_label || (item.options && item.options.length > 0)) && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[item.variant_label, ...(item.options || []).map((o) => o.choice)].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center rounded-full border bg-background p-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <span className="font-bold">Rs {item.price * item.quantity}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-dashed pt-2.5 mt-2.5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">سب ٹوٹل</span>
                <span className="font-semibold">Rs {totalPrice}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ڈلیوری فیس</span>
                <span className="font-semibold">{quoteLoading ? "حساب ہو رہا ہے…" : `Rs ${deliveryFee}`}</span>
              </div>
              {deliveryQuote && !isRestaurantOrder && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-foreground">
                    <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-primary" />{formatDeliveryMode(deliveryQuote.mode)}</span>
                    <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5 text-primary" />{deliveryQuote.weight_kg.toFixed(1)} کلو</span>
                    {deliveryQuote.distance_km > 0 && <span className="flex items-center gap-1"><Route className="h-3.5 w-3.5 text-primary" />{deliveryQuote.distance_km.toFixed(1)} کلومیٹر</span>}
                  </div>
                  <p className="mt-1">{formatFeeBreakdown(deliveryQuote)}{deliveryQuote.vehicle_name ? ` · گاڑی: ${deliveryQuote.vehicle_name}` : ""}</p>
                  {deliveryQuote.needs_quote && <p className="mt-1 font-bold text-destructive">اس bulk آرڈر کے لیے حتمی کرایہ دکاندار/ایڈمن کی منظوری کے بعد آئے گا۔</p>}
                </div>
              )}
              {voucher && (
                <div className="flex justify-between text-xs text-success">
                  <span className="font-semibold">واؤچر ({voucher.code})</span>
                  <span className="font-bold">− Rs {voucher.discount}</span>
                </div>
              )}
            </div>

            {/* Voucher input */}
            {!voucher ? (
              <div className="flex gap-2 mt-2.5">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    placeholder="واؤچر کوڈ لکھیں (مثلاً BAZAR10)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="h-10 pl-9 rounded-xl bg-background/80 font-mono text-sm"
                  />
                </div>
                <Button variant="outline" onClick={applyVoucher} disabled={applyingVoucher || !voucherCode.trim()} className="h-10 rounded-xl border-primary/40 text-primary font-bold">
                  {applyingVoucher ? "..." : "لگائیں"}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setVoucher(null); setVoucherCode(""); }}
                className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 border border-success/30 rounded-full px-3 py-1.5"
              >
                <Ticket className="w-3.5 h-3.5" /> {voucher.code} لاگو ہے
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            <div className="border-t pt-3 flex justify-between items-baseline">
              <span className="font-extrabold text-foreground">کل قابل ادائیگی</span>
              <span className="text-2xl font-extrabold text-primary">Rs {grandTotal}</span>
            </div>
          </div>
        </div>

        <BoughtTogether
          sourceId={items[0]?.sourceId}
          source={(items[0]?.source as "restaurant" | "grocery") || "restaurant"}
          sourceName={items[0]?.restaurant || ""}
        />

        {/* Delivery Info - Glass */}
         <div className="glass rounded-2xl p-4 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            ڈلیوری کی معلومات
          </h2>
          {storeType === "wholesale" && cities.length > 0 && (
            <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="mb-1 block text-xs font-bold text-foreground">مال کہاں پہنچانا ہے؟</label>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">شہر بدلنے سے intercity یا courier delivery quote خودکار دوبارہ بنے گا۔</p>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-muted-foreground">ڈیلیوری کا پتہ</p>
                <p className="truncate text-xs font-extrabold text-foreground">{address || "ابھی کوئی پتہ منتخب نہیں"}</p>
              </div>
              <button
                onClick={() => setLocSheetOpen(true)}
                className="shrink-0 rounded-full bg-card px-3 py-1 text-[11px] font-bold text-primary shadow-soft active:scale-95 transition-transform"
              >
                {address ? "تبدیل کریں" : "شامل کریں"}
              </button>
            </div>

            <button
              onClick={() => setEditingAddress((v) => !v)}
              className="text-[11px] font-bold text-primary"
            >
              {editingAddress ? "ترمیم بند کریں" : "پتہ خود لکھیں / درست کریں"}
            </button>

            {editingAddress && (
              <>
                <div className="flex gap-2">
                  <Input placeholder="مکمل ڈلیوری ایڈریس" value={address} onChange={(e) => { setAddress(e.target.value); }} required className="flex-1 h-11 rounded-xl bg-background/80" />
                  <Button variant="outline" onClick={getCurrentLocation} disabled={locating} className="shrink-0 h-11 px-3 rounded-xl glass border-primary/30 hover:bg-primary/10">
                    <LocateFixed className={`h-4 w-4 text-primary ${locating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={saveThisAddress} onChange={(e) => setSaveThisAddress(e.target.checked)} className="accent-primary w-4 h-4" />
                  یہ پتہ محفوظ کریں تاکہ اگلی بار دوبارہ نہ لکھنا پڑے
                </label>
              </>
            )}
            {coords && (
              <p className="text-xs text-primary font-semibold">📍 GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
            )}
            <LocationSheet
              open={locSheetOpen}
              onOpenChange={setLocSheetOpen}
              onSelected={(loc) => {
                setAddress(loc.address);
                if (loc.lat && loc.lng) setCoords({ lat: loc.lat, lng: loc.lng });
                setSaveThisAddress(false);
              }}
            />
            <Input placeholder="کوئی خاص ہدایات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 rounded-xl bg-background/80" />
            {restaurantDeliveryMode === "self" && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                🚚 مفت ڈلیوری — ریسٹورنٹ خود ڈلیور کرے گا
              </div>
            )}
          </div>
        </div>

        {/* Gift Delivery - Glass */}
         <details className="glass rounded-2xl border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "120ms" }}>
           <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-extrabold text-foreground">
             <div className="w-7 h-7 rounded-lg bg-secondary text-primary flex items-center justify-center"><Gift className="w-3.5 h-3.5" /></div>
             گفٹ ڈلیوری <span className="ms-auto text-[11px] font-normal text-muted-foreground">اختیاری</span>
           </summary>
           <div className="px-4 pb-4">
          <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${isGift ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/30"}`}>
            <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="accent-primary w-4 h-4" />
            <span className="font-semibold text-sm">کسی اور کو ڈلیور کریں 🎁</span>
          </label>
          {isGift && (
            <div className="space-y-3 mt-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input placeholder="وصول کنندہ کا نام" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="h-11 rounded-xl bg-background/80" />
               </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input placeholder="وصول کنندہ کا فون نمبر *" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} required className="h-11 rounded-xl bg-background/80" />
              </div>
            </div>
          )}
           </div>
         </details>

        {/* Payment - Glass */}
         <div className="glass rounded-2xl p-4 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "180ms" }}>
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            ادائیگی کا طریقہ
          </h2>
          <div className="flex items-center gap-3 p-3 border-2 border-primary bg-primary/10 rounded-xl shadow-glow">
            <span className="text-lg">💵</span>
            <span className="font-semibold text-sm">کیش آن ڈلیوری (COD)</span>
          </div>
        </div>

        <PromotionalAds placement="checkout" className="!px-0" />
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-elegant">
        <div className="container mx-auto max-w-2xl flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">کل قابل ادائیگی</p>
            <p className="text-lg font-extrabold text-primary leading-tight">Rs {grandTotal}</p>
          </div>
          <Button className="flex-[2] h-12 text-base font-extrabold bg-gradient-primary shadow-glow hover:shadow-elegant hover:scale-[1.02] transition-all" disabled={submitting} onClick={placeOrder}>
            {submitting ? "بھیجا جا رہا ہے..." : "آرڈر کی تصدیق کریں ✓"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
