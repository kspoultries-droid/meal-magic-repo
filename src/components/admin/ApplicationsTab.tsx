import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Phone, MapPin, RefreshCw, FileImage, MessageCircle } from "lucide-react";

const APP_URL = "https://easylife.apnahub.online";

const openWA = (phone: string, message: string) => {
  const clean = phone.replace(/\D/g, "").replace(/^0/, "92");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
};

const signedDocUrl = async (path: string) => {
  const { data } = await supabase.storage.from("partner-documents").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
};

const ApplicationsTab = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_applications")
      .select("*, cities(name)")
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);


  const approve = async (app: any) => {
    const { error } = await supabase.rpc("approve_partner_application", { _application_id: app.id });
    if (error) return toast.error(error.message);
    toast.success("منظور ہو گیا! رول assign ہو گیا۔");
    if (app.whatsapp || app.phone) {
      openWA(app.whatsapp || app.phone,
        `السلام علیکم ${app.owner_name}،\n\nآپ کی EasyLife پارٹنر درخواست منظور ہو گئی ہے! 🎉\n\nAb aap login karke apna dashboard use kar sakte hain:\n${APP_URL}\n\n— EasyLife Team`);
    }
    fetchApps();
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return toast.error("وجہ لکھیں");
    const app = apps.find(a => a.id === rejectId);
    const { error } = await supabase.rpc("reject_partner_application", { _application_id: rejectId, _reason: rejectReason });
    if (error) return toast.error(error.message);
    toast.success("مسترد کر دیا");
    if (app && (app.whatsapp || app.phone)) {
      openWA(app.whatsapp || app.phone,
        `السلام علیکم ${app.owner_name}،\n\nمعذرت، فی الحال آپ کی EasyLife پارٹنر درخواست منظور نہیں ہو سکی۔\n\nوجہ: ${rejectReason}\n\nمزید معلومات کے لیے رابطہ کریں۔\n— EasyLife Team`);
    }
    setRejectId(null); setRejectReason("");
    fetchApps();
  };

  const viewDoc = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("فائل نہیں کھلی");
  };

  const filtered = apps.filter(a => a.status === filter);
  const pendingCount = apps.filter(a => a.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">پارٹنر درخواستیں</h2>
        <Button size="sm" variant="outline" onClick={fetchApps}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">زیر جائزہ {pendingCount > 0 && <Badge className="ml-2">{pendingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="approved">منظور شدہ</TabsTrigger>
          <TabsTrigger value="rejected">مسترد</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-3 mt-4">
          {loading ? <p>لوڈ ہو رہا ہے...</p> :
           filtered.length === 0 ? <p className="text-muted-foreground text-center py-8">کوئی درخواست نہیں</p> :
           filtered.map(app => (
            <Card key={app.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{app.business_name}</h3>
                      <Badge variant="outline">{app.applicant_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">مالک: {app.owner_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="w-3 h-3" /> {app.phone}
                      </a>
                      {app.whatsapp && (
                        <a href={`https://wa.me/${app.whatsapp.replace(/\D/g, "")}`} target="_blank" className="text-green-600">
                          WhatsApp
                        </a>
                      )}
                      {app.cities?.name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.cities.name}</span>}
                      {app.category && <Badge variant="secondary" className="text-[10px]">{app.category}</Badge>}
                    </div>
                    {app.address && <p className="text-xs mt-1">📍 {app.address}</p>}
                    {app.cnic && <p className="text-xs">CNIC: {app.cnic}</p>}
                    {(app.cnic_image_url || app.shop_image_url) && (
                      <div className="flex gap-2 mt-2">
                        {app.cnic_image_url && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(app.cnic_image_url)}>
                            <FileImage className="w-3 h-3 mr-1" /> CNIC
                          </Button>
                        )}
                        {app.shop_image_url && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(app.shop_image_url)}>
                            <FileImage className="w-3 h-3 mr-1" /> دکان/گاڑی
                          </Button>
                        )}
                      </div>
                    )}
                    {app.admin_notes && <p className="text-xs text-destructive mt-1">Note: {app.admin_notes}</p>}
                  </div>

                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(app)} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-1" /> منظور
                      </Button>
                      <Dialog open={rejectId === app.id} onOpenChange={(o) => !o && setRejectId(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(app.id)}>
                            <X className="w-4 h-4 mr-1" /> رد
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>مسترد کرنے کی وجہ</DialogTitle></DialogHeader>
                          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="وجہ لکھیں..." />
                          <Button onClick={reject} variant="destructive">مسترد کریں</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {app.status !== "pending" && (app.whatsapp || app.phone) && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-600"
                      onClick={() => openWA(app.whatsapp || app.phone, `السلام علیکم ${app.owner_name}،\n\nEasyLife ٹیم کی طرف سے رابطہ۔`)}>
                      <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationsTab;
