import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Store, ShoppingCart, Package, Wrench, Bike, CheckCircle2, ExternalLink } from "lucide-react";

import RiderVerification, { type RiderKycState } from "@/components/partner/RiderVerification";
import PartnerVerification, { type PartnerKycState } from "@/components/partner/PartnerVerification";

type PartnerType = "restaurant" | "grocery" | "wholesale" | "service_provider" | "rider";

const TYPES: { value: PartnerType; label: string; urdu: string; icon: any; desc: string }[] = [
  { value: "restaurant", label: "Restaurant", urdu: tr("Restaurant", "ریسٹورنٹ"), icon: Store, desc: tr("Food Shop", "کھانے کی دکان") },
  { value: "grocery", label: "Grocery", urdu: tr("Grocery", "گروسری"), icon: ShoppingCart, desc: tr("Retail / Grocery", "پرچون / کریانہ") },
  { value: "wholesale", label: "Wholesale", urdu: tr("Wholesale", "ہول سیل"), icon: Package, desc: tr("Market Vendor", "بازار وینڈر") },
  { value: "service_provider", label: "Service", urdu: tr("Services", "سروس"), icon: Wrench, desc: tr("Mechanic / Plumber / Electrician", "مکینک / پلمبر / الیکٹریشن") },
  { value: "rider", label: "Rider", urdu: tr("Rider", "رائیڈر"), icon: Bike, desc: tr("Delivery Boy", "ڈیلیوری بوائے") },
];

const dashboardLabel: Record<PartnerType, string> = {
  restaurant: tr("Open Restaurant Dashboard", "ریسٹورنٹ ڈیش بورڈ کھولیں"),
  grocery: tr("Open Your Store", "اپنا اسٹور کھولیں"),
  wholesale: tr("Open Wholesale Store", "ہول سیل اسٹور کھولیں"),
  service_provider: tr("Open Service Dashboard", "سروس ڈیش بورڈ کھولیں"),
  rider: tr("Open Rider Dashboard", "رائیڈر ڈیش بورڈ کھولیں"),
};

const Partner = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isRider, isRestaurantOwner, isMechanic, refreshRoles } = useAuth();

  // Role-conflict aware: rider can't apply as vendor; vendor can't apply as rider (admins can test all)
  const availableTypes = TYPES.filter(t => {
    if (isAdmin) return true;
    if (isRider) return t.value === "rider"; // rider stays rider
    if (isRestaurantOwner || isMechanic) return t.value !== "rider"; // vendors can't become riders
    return true;
  });

  const [tab, setTab] = useState<PartnerType>(availableTypes[0]?.value || "restaurant");
  const [cities, setCities] = useState<any[]>([]);
  const [myApps, setMyApps] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!availableTypes.find(t => t.value === tab) && availableTypes[0]) {
      setTab(availableTypes[0].value);
    }
  }, [isRider, isRestaurantOwner, isMechanic]);

  const [form, setForm] = useState({
    business_name: "", owner_name: "", phone: "", whatsapp: "",
    cnic: "", email: "", city_id: "", address: "", category: "",
    referral_code: "",
  });
  const [pkyc, setPkyc] = useState<PartnerKycState>({ kycOk: false, shopPath: null, chequePath: null, lat: null, lng: null, payout: { payout_method: "", bank_name: "", account_title: "", account_number: "" } });
  const [platefile, setPlateFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [kyc, setKyc] = useState<RiderKycState>({
    verified: false, status: "none", biometric: false,
    cnicFrontPath: null, cnicBackPath: null, selfiePath: null, bikePath: null, platePath: null,
  });


  useEffect(() => {
    supabase.from("cities").select("id,name").order("name").then(({ data }) => setCities(data || []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("partner_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setMyApps(data || []));
  }, [user]);

  const uploadDoc = async (file: File, prefix: string): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("partner-documents").upload(path, file, { upsert: true });
    if (error) { toast.error(tr("File upload failed: ", "فائل اپلوڈ ناکام: ") + error.message); return null; }
    return path;
  };

  const submit = async () => {
    const isRider = tab === "rider";
    if (!form.business_name || !form.phone) {
      toast.error(isRider ? tr("Name and phone are required", "نام اور فون ضروری ہے") : tr("Business name, owner, and phone are required", "کاروبار کا نام، مالک اور فون ضروری ہے"));
      return;
    }
    if (!isRider && !form.owner_name) {
      toast.error(tr("Owner name is required", "مالک کا نام ضروری ہے"));
      return;
    }
    if (!user) {
      toast.error(tr("Create account / Log in first", "پہلے اکاؤنٹ بنائیں / لاگ ان کریں"));
      navigate("/auth");
      return;
    }
    if (!isRider && !user.email_confirmed_at) {
      toast.error(tr("Verify your email first, then apply", "پہلے اپنی ای میل کی تصدیق کریں، پھر درخواست دیں"));
      return;
    }
    if (form.cnic.replace(/\D/g, "").length !== 13) { toast.error(tr("Enter 13-digit CNIC number", "شناختی کارڈ نمبر 13 ہندسوں کا لکھیں")); return; }
    if (form.phone.replace(/\D/g, "").length < 10) { toast.error(tr("Enter a valid phone number", "درست فون نمبر لکھیں")); return; }
    if (!form.city_id) { toast.error(tr("Select city", "شہر منتخب کریں")); return; }
    if (form.address.trim().length < 10) { toast.error(tr("Enter full address (matching CNIC address)", "مکمل پتہ لکھیں (کارڈ کے پتے سے میل کھاتا)")); return; }
    if (isRider) {
      if (!kyc.verified) { toast.error(tr("Complete identity verification first", "پہلے شناخت کی تصدیق مکمل کریں")); return; }
      if (!kyc.biometric) { toast.error(tr("Fingerprint / biometric registration is required", "فنگر پرنٹ / بایومیٹرک رجسٹر کرنا لازمی ہے")); return; }
    } else {
      if (!pkyc.kycOk) { toast.error(tr("Complete CNIC and selfie verification", "شناختی کارڈ اور سیلفی کی تصدیق مکمل کریں")); return; }
      if (!pkyc.shopPath || pkyc.lat == null) { toast.error(tr("Shop photo and map location are required", "دکان کی تصویر اور نقشے پر جگہ لازمی ہے")); return; }
      if (!pkyc.payout.payout_method || !pkyc.payout.account_title || pkyc.payout.account_number.length < 8 || !pkyc.chequePath) {
        toast.error(tr("Payment account and cheque / proof photo are required", "ادائیگی کا اکاؤنٹ اور چیک / ثبوت کی تصویر لازمی ہے")); return;
      }
    }
    setSubmitting(true);

    let cnic_image_url: string | null = null;
    let shop_image_url: string | null = null;
    let numberplate_url: string | null = null;
    let selfie_url: string | null = null;
    if (isRider) {
      cnic_image_url = kyc.cnicFrontPath;
      shop_image_url = kyc.bikePath;
      numberplate_url = kyc.platePath;
      selfie_url = kyc.selfiePath;
    } else {
      shop_image_url = pkyc.shopPath;
    }

    // Resolve referral code -> referrer user id (optional)
    let referred_by: string | null = null;
    if (form.referral_code.trim()) {
      const { data: ref } = await supabase.from("profiles").select("id")
        .eq("referral_code", form.referral_code.trim().toUpperCase()).maybeSingle();
      if (ref?.id) referred_by = ref.id;
    }

    const { business_name, owner_name, phone, whatsapp, cnic, email, city_id, address, category } = form;
    const extra: Record<string, any> = {};
    if (referred_by) extra.referred_by = referred_by;
    if (numberplate_url) extra.numberplate_url = numberplate_url;
    if (selfie_url) extra.selfie_url = selfie_url;
    if (isRider) {
      extra.cnic_back_url = kyc.cnicBackPath;
      extra.kyc_status = kyc.status;
      extra.biometric_registered = kyc.biometric;
    } else {
      Object.assign(extra, pkyc.payout, { cheque_path: pkyc.chequePath });
    }

    const { data: inserted, error } = await supabase.from("partner_applications").insert({
      user_id: user.id,
      applicant_type: tab,
      business_name,
      owner_name: isRider ? business_name : owner_name,
      phone, whatsapp, cnic, address, category,
      email: email || user.email,
      city_id: city_id || null,
      location_lat: isRider ? null : pkyc.lat,
      location_lng: isRider ? null : pkyc.lng,
      cnic_image_url,
      shop_image_url,
      extra,
    }).select("id").maybeSingle();
    if (!error && isRider && inserted?.id) {
      await supabase.from("rider_verifications").update({ application_id: inserted.id }).eq("user_id", user.id);
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Application submitted! Admin will contact you soon.", "درخواست جمع ہو گئی! ایڈمن جلد رابطہ کرے گا۔"));
    setForm({ business_name: "", owner_name: "", phone: "", whatsapp: "", cnic: "", email: "", city_id: "", address: "", category: "", referral_code: "" });
    setPlateFile(null); setSelfieFile(null);
    const { data } = await supabase.from("partner_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMyApps(data || []);
  };

  const active = TYPES.find(t => t.value === tab)!;

  const openApprovedDashboard = async (app: any) => {
    await refreshRoles();

    if (app.applicant_type === "rider") {
      navigate("/rider-dashboard");
      return;
    }
    if (app.applicant_type === "service_provider") {
      navigate("/mechanic-dashboard");
      return;
    }
    if (app.applicant_type === "restaurant") {
      navigate("/restaurant-dashboard");
      return;
    }

    const storeType = app.applicant_type === "wholesale" ? "wholesale" : "retail";
    const { data: store } = await supabase
      .from("grocery_stores")
      .select("id")
      .eq("owner_id", app.user_id)
      .eq("store_type", storeType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (store?.id) {
      navigate(`/grocery/${store.id}`);
      return;
    }

    navigate(app.applicant_type === "wholesale" ? "/wholesale" : "/grocery");
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 text-primary-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> {tr("Back", "واپس")}
        </Button>

        <Card className="glass border-white/20 shadow-elegant mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              {tr("Become an EasyLife Partner", "EasyLife پارٹنر بنیں")}
            </CardTitle>
            <CardDescription>
              {tr("Bring your business to our platform — registration is free", "اپنا کاروبار ہمارے پلیٹ فارم پر لائیں — رجسٹریشن مفت ہے")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableTypes.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 text-center">
                {tr("You are already a partner. One person cannot be a rider and vendor at the same time. View your existing applications below.", "آپ پہلے سے پارٹنر ہیں۔ ایک بندہ بیک وقت رائیڈر اور دکاندار نہیں ہو سکتا۔ نیچے اپنی موجودہ درخواستیں دیکھیں۔")}
              </div>
            ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as PartnerType)}>
              {!isAdmin && isRider && (
                <p className="mb-3 p-3 rounded-lg bg-muted text-xs text-muted-foreground text-center">
                  {tr("Your account is registered as a rider. Please sign in with a different account to apply for a shop, restaurant, market, or service.", "آپ کا اکاؤنٹ رائیڈر ہے، اس لیے دکان، ریسٹورنٹ، بازار یا سروس کی درخواست کے لیے الگ اکاؤنٹ سے سائن اِن کریں۔")}
                </p>
              )}
              <TabsList className="grid h-auto mb-4" style={{ gridTemplateColumns: `repeat(${availableTypes.length}, minmax(0, 1fr))` }}>
                {availableTypes.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="flex-col gap-1 py-2 text-[10px]">
                    <t.icon className="w-4 h-4" />
                    {t.urdu}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={tab} className="space-y-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <active.icon className="w-4 h-4 text-primary" />
                    {active.urdu} — {active.desc}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder={tab === "rider" ? tr("Full Name", "پورا نام") : tr("Business / Shop Name", "کاروبار / دکان کا نام")}
                    value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} />
                  {tab !== "rider" && (
                    <Input placeholder={tr("Owner's Name", "مالک کا نام")} value={form.owner_name}
                      onChange={e => setForm({ ...form, owner_name: e.target.value })} />
                  )}
                  <Input placeholder={tr("Phone Number", "فون نمبر")} value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="WhatsApp" value={form.whatsapp}
                    onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
                  <Input placeholder={tr("CNIC Number *", "شناختی کارڈ نمبر *")} inputMode="numeric" value={form.cnic}
                    onChange={e => setForm({ ...form, cnic: e.target.value })} />
                  <Input placeholder={tr("Email", "ای میل")} value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                  <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
                    <SelectTrigger><SelectValue placeholder={tab === "rider" ? tr("Select City *", "شہر منتخب کریں *") : tr("Select city", "شہر منتخب کریں")} /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(tab === "wholesale" || tab === "service_provider") && (
                    <Input placeholder={tr("Category (e.g. Mobile, Plumber)", "کیٹیگری (مثلاً موبائل، پلمبر)")}
                      value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                  )}
                </div>
                <Textarea placeholder={tr("Full Address", "مکمل پتہ")} value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />

                {tab === "rider" ? (
                  <RiderVerification
                    cnic={form.cnic}
                    fullName={form.business_name}
                    address={form.address}
                    onChange={setKyc}
                  />
                ) : (
                  <PartnerVerification cnic={form.cnic} fullName={form.owner_name} address={form.address} onChange={setPkyc} />
                )}

                <Input placeholder={tr("Referral Code (if any)", "ریفرل کوڈ (اگر کسی نے دیا ہو)")} value={form.referral_code}
                  onChange={e => setForm({ ...form, referral_code: e.target.value.toUpperCase() })} maxLength={6} />

                <Button className="w-full h-11" onClick={submit} disabled={submitting}>
                  {submitting ? tr("Submitting...", "جمع ہو رہا ہے...") : tr("Submit Application", "درخواست جمع کریں")}
                </Button>

                {!user && (
                  <p className="text-xs text-center text-muted-foreground">
                    {tr("Before submitting application", "درخواست جمع کرنے سے پہلے")} <button className="text-primary underline" onClick={() => navigate("/auth")}>{tr("Create Account", "اکاؤنٹ بنائیں")}</button>
                  </p>
                )}
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>

        {user && myApps.length > 0 && (
          <Card className="glass border-white/20">
            <CardHeader><CardTitle className="text-lg">{tr("My Applications", "میری درخواستیں")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myApps.map(app => (
                <div key={app.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card/50">
                  <div>
                    <p className="font-semibold text-sm">{app.business_name}</p>
                    <p className="text-xs text-muted-foreground">{app.applicant_type}</p>
                    {app.status === "approved" && (
                      <p className="text-[11px] text-primary mt-1">{tr("Approval complete — tap the button below to get started", "منظوری مکمل — اب نیچے والا بٹن دبا کر کام شروع کریں")}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                      {app.status === "approved" ? <><CheckCircle2 className="w-3 h-3 mr-1" /> {tr("Approved", "منظور")}</> :
                       app.status === "rejected" ? tr("Rejected", "مسترد") : tr("Under Review", "زیر جائزہ")}
                    </Badge>
                    {app.status === "approved" && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => openApprovedDashboard(app)}>
                        <ExternalLink className="w-3 h-3 mr-1" /> {dashboardLabel[app.applicant_type as PartnerType] || tr("Dashboard", "ڈیش بورڈ")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Partner;
