import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminPagination } from "./AdminListTools";
import { toast } from "sonner";
import { Check, X, Phone, MapPin, RefreshCw, FileImage, MessageCircle } from "lucide-react";

const APP_URL = "https://easylife.apnahub.online";

const openWA = (phone: string, message: string) => {
  const clean = phone.replace(/\D/g, "").replace(/^0/, "92");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
};

const signedDocUrl = async (path: string) => {
  const { data } = await supabase.functions.invoke("staff-private-document", { body: { path } });
  return data?.signedUrl || null;
};

const ApplicationsTab = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [kycMap, setKycMap] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sel, setSel] = useState<string[]>([]);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_applications")
      .select("*, cities(name)")
      .order("created_at", { ascending: false });
    setApps(data || []);
    const riderUsers = (data || []).filter((a: any) => a.applicant_type === "rider" && a.user_id).map((a: any) => a.user_id);
    if (riderUsers.length) {
      const { data: kyc } = await supabase.from("rider_verifications").select("*").in("user_id", riderUsers);
      const map: Record<string, any> = {};
      (kyc || []).forEach((k: any) => { map[k.user_id] = k; });
      setKycMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);


  const approve = async (app: any) => {
    if (app.applicant_type === "rider") {
      const k = kycMap[app.user_id];
      if (!k) return toast.error(tr("Rider ID verification missing — cannot approve", "رائیڈر کی شناختی تصدیق موجود نہیں — منظوری ممکن نہیں"));
      if (k.status === "failed") return toast.error(tr("Verification failed — have rider reverify first", "تصدیق ناکام ہے — پہلے رائیڈر سے دوبارہ تصدیق کروائیں"));
      if (k.status === "manual_review" && !window.confirm(tr("Auto-verification incomplete (manual review). Do you want to approve with responsibility?", "خودکار تصدیق مکمل نہیں (دستی جائزہ)۔ کیا آپ ذمہ داری سے منظور کرنا چاہتے ہیں؟"))) return;
    }
    const { error } = await supabase.rpc("approve_partner_application", { _application_id: app.id });
    if (error) return toast.error(error.message);
    toast.success(tr("Approved! Role assigned.", "منظور ہو گیا! رول assign ہو گیا۔"));
    if (app.whatsapp || app.phone) {
      openWA(app.whatsapp || app.phone,
        `${tr("Assalamu Alaikum", "السلام علیکم")} ${app.owner_name}${tr(",\n\nYour EasyLife Partner application has been approved! 🎉\n\nYou can now log in and access your dashboard:", "،\n\nآپ کی EasyLife پارٹنر درخواست منظور ہو گئی ہے! 🎉\n\nAb aap login karke apna dashboard use kar sakte hain:")}
${APP_URL}

— EasyLife Team`);
    }
    fetchApps();
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return toast.error(tr("Enter reason", "وجہ لکھیں"));
    const app = apps.find(a => a.id === rejectId);
    const { error } = await supabase.rpc("reject_partner_application", { _application_id: rejectId, _reason: rejectReason });
    if (error) return toast.error(error.message);
    toast.success(tr("Rejected", "مسترد کر دیا"));
    if (app && (app.whatsapp || app.phone)) {
      openWA(app.whatsapp || app.phone,
        `${tr("Assalamu Alaikum", "السلام علیکم")} ${app.owner_name}${tr(",\n\nSorry, your EasyLife Partner application could not be approved at this time.\n\nReason:", "،\n\nمعذرت، فی الحال آپ کی EasyLife پارٹنر درخواست منظور نہیں ہو سکی۔\n\nوجہ:")} ${rejectReason}

${tr("Contact us for more information.\n— EasyLife Team", "مزید معلومات کے لیے رابطہ کریں۔\n— EasyLife Team")}`);
    }
    setRejectId(null); setRejectReason("");
    fetchApps();
  };

  const viewDoc = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error(tr("File could not be opened", "فائل نہیں کھلی"));
  };

  const filtered = apps.filter(a =>
    a.status === filter &&
    (!q.trim() || `${a.business_name || ""} ${a.owner_name || ""} ${a.phone || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
  );
  const pendingCount = apps.filter(a => a.status === "pending").length;

  const toggleSel = (id: string) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const allSelected = filtered.length > 0 && filtered.every(a => sel.includes(a.id));

  const bulkApprove = async () => {
    const targets = apps.filter(a => sel.includes(a.id) && a.status === "pending");
    if (bulkBusy) return;
    if (targets.length === 0) return toast.error(tr("No pending application selected", "کوئی زیر جائزہ درخواست منتخب نہیں"));
    if (!window.confirm(`${targets.length} ${tr("Approve applications?", "درخواستیں منظور کی جائیں؟")}`)) return;
    const needsReview = targets.filter(app => app.applicant_type === "rider" && kycMap[app.user_id]?.status === "manual_review");
    if (needsReview.length > 0 && !window.confirm(`${needsReview.length} ${tr("Rider ID manual review required. Confirm review and approve responsibly?", "رائیڈرز کا دستی شناختی جائزہ درکار ہے۔ کیا جائزہ لے کر ذمہ داری سے منظور کرتے ہیں؟")}`)) return;
    setBulkBusy(true);
    let ok = 0; let skipped = 0;
    for (const app of targets) {
      if (app.applicant_type === "rider") {
        const k = kycMap[app.user_id];
        if (!k || k.status === "failed") { skipped++; continue; }
      }
      const { error } = await supabase.rpc("approve_partner_application", { _application_id: app.id });
      if (error) skipped++; else ok++;
    }
    setBulkBusy(false);
    toast.success(`${ok} ${tr("Approved", "منظور")}${skipped ? ` — ${skipped} چھوڑ دی گئیں (تصدیق درکار)` : ""}`);
    setSel([]);
    fetchApps();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{tr("Partner Requests", "پارٹنر درخواستیں")}</h2>
        <Button size="sm" variant="outline" onClick={fetchApps}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => { setFilter(v as any); setSel([]); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending">{tr("Under Review", "زیر جائزہ")} {pendingCount > 0 && <Badge className="ml-2">{pendingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="approved">{tr("Approved", "منظور شدہ")}</TabsTrigger>
          <TabsTrigger value="rejected">{tr("Rejected", "مسترد")}</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-3 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel([]); setPage(1); }}
              placeholder={tr("Search by name, owner, or phone...", "نام، مالک یا فون سے تلاش کریں...")}
              className="h-8 w-full max-w-[240px] rounded-md border bg-background px-2 text-xs text-foreground"
            />
            {filter === "pending" && filtered.length > 0 && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-[11px]"
                  onClick={() => setSel(allSelected ? [] : filtered.map(a => a.id))}>
                  {allSelected ? tr("Deselect All", "سب غیر منتخب") : tr("Select all", "سب منتخب")}
                </Button>
                {sel.length > 0 && (
                  <Button size="sm" className="h-8 text-[11px]" disabled={bulkBusy} onClick={bulkApprove}>
                    {sel.length} {tr("Approve", "منظور کریں")}
                  </Button>
                )}
              </>
            )}
          </div>
          {loading ? <p>{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> :
           filtered.length === 0 ? <p className="text-muted-foreground text-center py-8">{tr("No requests", "کوئی درخواست نہیں")}</p> :
           filtered.slice((page - 1) * 20, page * 20).map(app => (
            <Card key={app.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      {app.status === "pending" && (
                        <input type="checkbox" checked={sel.includes(app.id)} onChange={() => toggleSel(app.id)} aria-label={app.business_name} />
                      )}
                      <h3 className="font-bold">{app.business_name}</h3>
                      <Badge variant="outline">{app.applicant_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tr("Owner:", "مالک:")} {app.owner_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="w-3 h-3" /> {app.phone}
                      </a>
                      {app.whatsapp && (
                        <a href={`https://wa.me/${app.whatsapp.replace(/\D/g, "")}`} target="_blank" className="text-success">
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
                            <FileImage className="w-3 h-3 mr-1" /> {tr("Shop/Vehicle", "دکان/گاڑی")}
                          </Button>
                        )}
                      </div>
                    )}
                    {app.applicant_type !== "rider" && app.extra && (
                      <div className="mt-2 rounded-lg border p-2 space-y-1 text-xs">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={app.extra.kyc_status === "verified" ? "default" : app.extra.kyc_status ? "secondary" : "destructive"} className="text-[10px]">
                            {tr("ID:", "شناخت:")} {app.extra.kyc_status === "verified" ? tr("Verified", "تصدیق شدہ") : app.extra.kyc_status === "manual_review" ? tr("Manual Review", "دستی جائزہ") : tr("Old request — Unverified", "پرانی درخواست — تصدیق نہیں")}
                          </Badge>
                          {app.extra.email_verified && <Badge variant="outline" className="text-[10px]">{tr("Email verified", "ای میل تصدیق شدہ")}</Badge>}
                          {app.extra.cnic_expiry && <Badge variant="outline" className="text-[10px]">{tr("Card expiry:", "کارڈ میعاد:")} {app.extra.cnic_expiry}</Badge>}
                        </div>
                        {app.extra.account_number && (
                          <p>💳 {app.extra.payout_method} {app.extra.bank_name ? `· ${app.extra.bank_name}` : ""} · {app.extra.account_title} · {app.extra.account_number}</p>
                        )}
                        {app.location_lat && (
                          <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${app.location_lat},${app.location_lng}`}>{tr("View shop on map", "نقشے پر دکان دیکھیں")}</a>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {app.extra.cnic_back_url && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(app.extra.cnic_back_url)}><FileImage className="w-3 h-3 mr-1" /> {tr("CNIC back", "CNIC پیچھے")}</Button>}
                          {app.extra.selfie_url && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(app.extra.selfie_url)}><FileImage className="w-3 h-3 mr-1" /> {tr("Selfie", "سیلفی")}</Button>}
                          {app.extra.cheque_path && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(app.extra.cheque_path)}><FileImage className="w-3 h-3 mr-1" /> {tr("Cheque / Account proof", "چیک / اکاؤنٹ ثبوت")}</Button>}
                        </div>
                        {Array.isArray(app.extra.risk_flags) && app.extra.risk_flags.map((r: string) => (
                          <p key={r} className="text-destructive">⚠️ {r}</p>
                        ))}
                      </div>
                    )}
                    {app.applicant_type === "rider" && (() => {
                      const k = kycMap[app.user_id];
                      if (!k) return <p className="text-xs text-destructive mt-2">{tr("⚠️ No verification record found", "⚠️ تصدیق کا ریکارڈ موجود نہیں")}</p>;
                      return (
                        <div className="mt-2 rounded-lg border p-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={k.status === "verified" ? "default" : k.status === "manual_review" ? "secondary" : "destructive"} className="text-[10px]">
                              KYC: {k.status === "verified" ? tr("Verified", "تصدیق شدہ") : k.status === "manual_review" ? tr("Manual Review", "دستی جائزہ") : tr("Failed", "ناکام")} {k.ai_score}%
                            </Badge>
                            {k.cnic_expiry && <span className="text-[10px] text-muted-foreground">{tr("Expiry:", "میعاد:")} {k.cnic_expiry}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span>{k.cnic_match ? "✅" : "❌"} {tr("Number", "نمبر")}</span>
                            <span>{k.expiry_valid ? "✅" : "❌"} {tr("Expiry", "میعاد")}</span>
                            <span>{k.face_match ? "✅" : "❌"} {tr("Face", "چہرہ")}</span>
                            <span>{k.liveness_ok ? "✅" : "❌"} {tr("Live", "لائیو")}</span>
                            <span>{k.address_match ? "✅" : "❌"} {tr("Address", "پتہ")}</span>
                          </div>
                          {k.cnic_address && <p className="text-[10px] text-muted-foreground">{tr("Card address:", "کارڈ کا پتہ:")} {k.cnic_address}</p>}
                          {k.failure_reason && <p className="text-[10px] text-destructive">{k.failure_reason}</p>}
                          <div className="flex gap-2">
                            {k.back_url && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(k.back_url)}>
                                <FileImage className="w-3 h-3 mr-1" /> {tr("CNIC back", "CNIC پیچھے")}
                              </Button>
                            )}
                            {k.selfie_url && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDoc(k.selfie_url)}>
                                <FileImage className="w-3 h-3 mr-1" /> {tr("Selfie", "سیلفی")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {app.admin_notes && <p className="text-xs text-destructive mt-1">Note: {app.admin_notes}</p>}
                  </div>

                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(app)} >
                        <Check className="w-4 h-4 mr-1" /> {tr("Approved", "منظور")}
                      </Button>
                      <Dialog open={rejectId === app.id} onOpenChange={(o) => !o && setRejectId(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(app.id)}>
                            <X className="w-4 h-4 mr-1" /> {tr("Reject", "رد")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>{tr("Rejection Reason", "مسترد کرنے کی وجہ")}</DialogTitle></DialogHeader>
                          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tr("Enter reason...", "وجہ لکھیں...")} />
                          <Button onClick={reject} variant="destructive">{tr("Reject", "مسترد کریں")}</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {app.status !== "pending" && (app.whatsapp || app.phone) && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-success border-success"
                      onClick={() => openWA(app.whatsapp || app.phone, `${tr("Assalamu Alaikum", "السلام علیکم")} ${app.owner_name}${tr(",\n\nContact from EasyLife team.", "،\n\nEasyLife ٹیم کی طرف سے رابطہ۔")}`)}>
                      <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <AdminPagination page={page} count={filtered.length} onPage={setPage} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationsTab;
