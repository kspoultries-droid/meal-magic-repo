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
import { ArrowLeft, Store, ShoppingCart, Package, Wrench, Bike, CheckCircle2 } from "lucide-react";

type PartnerType = "restaurant" | "grocery" | "wholesale" | "service_provider" | "rider";

const TYPES: { value: PartnerType; label: string; urdu: string; icon: any; desc: string }[] = [
  { value: "restaurant", label: "Restaurant", urdu: "ریسٹورنٹ", icon: Store, desc: "کھانے کی دکان" },
  { value: "grocery", label: "Grocery", urdu: "گروسری", icon: ShoppingCart, desc: "پرچون / کریانہ" },
  { value: "wholesale", label: "Wholesale", urdu: "ہول سیل", icon: Package, desc: "بازار وینڈر" },
  { value: "service_provider", label: "Service", urdu: "سروس", icon: Wrench, desc: "مکینک / پلمبر / الیکٹریشن" },
  { value: "rider", label: "Rider", urdu: "رائیڈر", icon: Bike, desc: "ڈیلیوری بوائے" },
];

const Partner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<PartnerType>("restaurant");
  const [cities, setCities] = useState<any[]>([]);
  const [myApps, setMyApps] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    business_name: "", owner_name: "", phone: "", whatsapp: "",
    cnic: "", email: "", city_id: "", address: "", category: "",
    referral_code: "",
  });
  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [shopFile, setShopFile] = useState<File | null>(null);

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
    if (error) { toast.error("فائل اپلوڈ ناکام: " + error.message); return null; }
    return path;
  };

  const submit = async () => {
    if (!form.business_name || !form.owner_name || !form.phone) {
      toast.error("نام، مالک اور فون ضروری ہے");
      return;
    }
    if (!user) {
      toast.error("پہلے اکاؤنٹ بنائیں / لاگ ان کریں");
      navigate("/auth");
      return;
    }
    setSubmitting(true);

    let cnic_image_url: string | null = null;
    let shop_image_url: string | null = null;
    if (cnicFile) cnic_image_url = await uploadDoc(cnicFile, "cnic");
    if (shopFile) shop_image_url = await uploadDoc(shopFile, "shop");

    // Resolve referral code -> referrer user id (optional)
    let referred_by: string | null = null;
    if (form.referral_code.trim()) {
      const { data: ref } = await supabase.from("profiles").select("id")
        .eq("referral_code", form.referral_code.trim().toUpperCase()).maybeSingle();
      if (ref?.id) referred_by = ref.id;
    }

    const { business_name, owner_name, phone, whatsapp, cnic, email, city_id, address, category } = form;
    const { error } = await supabase.from("partner_applications").insert({
      user_id: user.id,
      applicant_type: tab,
      business_name, owner_name, phone, whatsapp, cnic, address, category,
      email: email || user.email,
      city_id: city_id || null,
      cnic_image_url,
      shop_image_url,
      extra: referred_by ? { referred_by } : {},
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("درخواست جمع ہو گئی! ایڈمن جلد رابطہ کرے گا۔");
    setForm({ business_name: "", owner_name: "", phone: "", whatsapp: "", cnic: "", email: "", city_id: "", address: "", category: "", referral_code: "" });
    setCnicFile(null); setShopFile(null);
    const { data } = await supabase.from("partner_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMyApps(data || []);
  };

  const active = TYPES.find(t => t.value === tab)!;

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 text-primary-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> واپس
        </Button>

        <Card className="glass border-white/20 shadow-elegant mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              EasyLife پارٹنر بنیں
            </CardTitle>
            <CardDescription>
              اپنا کاروبار ہمارے پلیٹ فارم پر لائیں — رجسٹریشن مفت ہے
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as PartnerType)}>
              <TabsList className="grid grid-cols-5 h-auto mb-4">
                {TYPES.map(t => (
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
                  <Input placeholder={tab === "rider" ? "پورا نام" : "کاروبار / دکان کا نام"}
                    value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} />
                  <Input placeholder="مالک کا نام" value={form.owner_name}
                    onChange={e => setForm({ ...form, owner_name: e.target.value })} />
                  <Input placeholder="فون نمبر" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="WhatsApp" value={form.whatsapp}
                    onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
                  <Input placeholder="CNIC (اختیاری)" value={form.cnic}
                    onChange={e => setForm({ ...form, cnic: e.target.value })} />
                  <Input placeholder="ای میل" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                  <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
                    <SelectTrigger><SelectValue placeholder="شہر منتخب کریں" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(tab === "wholesale" || tab === "service_provider") && (
                    <Input placeholder="کیٹیگری (مثلاً موبائل، پلمبر)"
                      value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                  )}
                </div>
                <Textarea placeholder="مکمل پتہ" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />

                <Button className="w-full h-11" onClick={submit} disabled={submitting}>
                  {submitting ? "جمع ہو رہا ہے..." : "درخواست جمع کریں"}
                </Button>

                {!user && (
                  <p className="text-xs text-center text-muted-foreground">
                    درخواست جمع کرنے سے پہلے <button className="text-primary underline" onClick={() => navigate("/auth")}>اکاؤنٹ بنائیں</button>
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {user && myApps.length > 0 && (
          <Card className="glass border-white/20">
            <CardHeader><CardTitle className="text-lg">میری درخواستیں</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                  <div>
                    <p className="font-semibold text-sm">{app.business_name}</p>
                    <p className="text-xs text-muted-foreground">{app.applicant_type}</p>
                  </div>
                  <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status === "approved" ? <><CheckCircle2 className="w-3 h-3 mr-1" /> منظور</> :
                     app.status === "rejected" ? "مسترد" : "زیر جائزہ"}
                  </Badge>
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
