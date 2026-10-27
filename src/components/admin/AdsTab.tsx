import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdSlide } from "@/components/PromotionalAds";
import AdProductPicker from "@/components/admin/AdProductPicker";
import { Plus, Trash2, RefreshCw, Megaphone, Eye, EyeOff, Package } from "lucide-react";

const PLACEMENT_LABELS: Record<string, string> = {
  home: "🏠 ہوم پیج",
  grocery: "🛒 گروسری",
  restaurant: "🍔 ریسٹورنٹ",
  checkout: "💳 چیک آؤٹ",
  bazar_top: "📦 بازار ٹاپ بینر (15)",
  bazar: "📦 بازار درمیانی ایڈ",
};

const AD_TYPES: Record<string, { label: string; hint: string; cta: string }> = {
  banner: { label: "🏢 برانڈ کیمپین", hint: "مثلاً JazzCash، Coca-Cola — صرف برانڈ کی تشہیر", cta: "مزید جانیں" },
  product: { label: "🛍️ ایک پروڈکٹ", hint: "کسی ایک چیز کی قیمت اور تصویر کے ساتھ", cta: "ابھی خریدیں" },
  offer: { label: "🏷️ ڈسکاؤنٹ / آفر", hint: "مثلاً 20% OFF یا پرومو کوڈ", cta: "آفر حاصل کریں" },
};

const AdsTab = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPackages, setShowPackages] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placements, setPlacements] = useState<string[]>(["home"]);
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [adType, setAdType] = useState("banner");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [offerBadge, setOfferBadge] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [showText, setShowText] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: adsData }, { data: pkgData }] = await Promise.all([
      supabase.from("promotional_ads").select("*").order("sort_order"),
      supabase.from("ad_packages").select("*").order("price_per_day"),
    ]);
    setAds(adsData || []);
    setPackages(pkgData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const togglePlacement = (p: string) => {
    setPlacements((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const resetForm = () => {
    setTitle(""); setBrandName(""); setImageUrl(""); setLinkUrl("");
    setPlacements(["home"]); setPackageId(""); setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(""); setPaymentStatus("pending"); setPaymentAmount(""); setImageFile(null); setEditId(null);
    setAdType("banner"); setSubtitle(""); setCtaText(""); setOfferBadge(""); setPromoCode("");
    setPrice(""); setOriginalPrice(""); setShowText(true); setPreviewUrl("");
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `ads/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("تصویر اپلوڈ ناکام"); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveAd = async () => {
    if (!title.trim() || !brandName.trim()) { toast.error("ٹائٹل اور برانڈ نام ضروری ہے"); return; }
    if (placements.length === 0) { toast.error("کم از کم ایک جگہ منتخب کریں"); return; }

    let finalImageUrl = imageUrl;
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (uploaded) finalImageUrl = uploaded;
    }

    const adData = {
      title, brand_name: brandName, image_url: finalImageUrl || null,
      link_url: linkUrl || null, placements,
      package_id: packageId || null,
      start_date: startDate,
      end_date: endDate || new Date(new Date(startDate).getTime() + 30 * 86400000).toISOString().split("T")[0],
      payment_status: paymentStatus,
      payment_amount: parseFloat(paymentAmount) || 0,
      ad_type: adType, subtitle: subtitle || null, cta_text: ctaText || null,
      offer_badge: offerBadge || null, promo_code: promoCode.trim().toUpperCase() || null,
      price: parseFloat(price) || null, original_price: parseFloat(originalPrice) || null,
      show_text: showText,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("promotional_ads").update(adData).eq("id", editId));
    } else {
      ({ error } = await supabase.from("promotional_ads").insert(adData));
    }

    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "ایڈ اپڈیٹ ہو گئی!" : "نئی ایڈ شامل ہو گئی! 🎉");
    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const editAd = (ad: any) => {
    setEditId(ad.id); setTitle(ad.title); setBrandName(ad.brand_name);
    setImageUrl(ad.image_url || ""); setLinkUrl(ad.link_url || "");
    setPlacements(ad.placements || ["home"]); setPackageId(ad.package_id || "");
    setStartDate(ad.start_date); setEndDate(ad.end_date);
    setPaymentStatus(ad.payment_status || "pending");
    setPaymentAmount(ad.payment_amount?.toString() || "");
    setAdType(ad.ad_type || "banner"); setSubtitle(ad.subtitle || ""); setCtaText(ad.cta_text || "");
    setOfferBadge(ad.offer_badge || ""); setPromoCode(ad.promo_code || "");
    setPrice(ad.price?.toString() || ""); setOriginalPrice(ad.original_price?.toString() || "");
    setShowText(ad.show_text !== false);
    setDialogOpen(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("promotional_ads").update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "ایڈ فعال ہو گئی" : "ایڈ غیر فعال ہو گئی");
    fetchData();
  };

  const deleteAd = async (id: string) => {
    if (!confirm("کیا آپ واقعی یہ ایڈ حذف کرنا چاہتے ہیں؟")) return;
    await supabase.from("promotional_ads").delete().eq("id", id);
    toast.success("ایڈ حذف ہو گئی");
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Ad Packages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="w-5 h-5" /> ایڈ پیکیجز / ریٹس</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowPackages(!showPackages)}>
            {showPackages ? "چھپائیں ▲" : "دیکھیں ▼"}
          </Button>
        </CardHeader>
        {showPackages && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border rounded-xl p-4 space-y-2">
                  <h3 className="font-bold text-foreground">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.placements?.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">{PLACEMENT_LABELS[p] || p}</Badge>
                    ))}
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p>📅 روزانہ: <strong>Rs {pkg.price_per_day}</strong></p>
                    <p>📅 ہفتہ وار: <strong>Rs {pkg.price_per_week}</strong></p>
                    <p>📅 ماہانہ: <strong>Rs {pkg.price_per_month}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ads Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> پروموشنل ایڈز</CardTitle>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی ایڈ</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editId ? "ایڈ ایڈٹ کریں" : "نئی ایڈ شامل کریں"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {/* Live preview */}
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">پیش منظر (فون پر ایسی نظر آئے گی)</p>
                    <AdSlide ad={{ id: "preview", title: title || "ایڈ کا عنوان", brand_name: brandName || "برانڈ", image_url: previewUrl || imageUrl || null, link_url: linkUrl || null, sort_order: 0, ad_type: adType, subtitle, cta_text: ctaText, offer_badge: offerBadge, promo_code: promoCode, price: parseFloat(price) || null, original_price: parseFloat(originalPrice) || null, show_text: showText }} eager />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">ایڈ کی قسم *</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(AD_TYPES).map(([key, t]) => (
                        <button key={key} type="button" onClick={() => { setAdType(key); if (!ctaText) setCtaText(t.cta); }}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${adType === key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{t.label}</button>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{AD_TYPES[adType]?.hint}</p>
                  </div>

                  <Input placeholder="کمپنی / دکان کا نام * (مثلاً JazzCash)" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                  <Input placeholder={adType === "product" ? "پروڈکٹ کا نام * (مثلاً Coke 1.5L)" : "بڑا عنوان * (مثلاً ہر بل پر 10% کیش بیک)"} value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Input placeholder="چھوٹی لائن (اختیاری) — مثلاً صرف اس ہفتے" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />

                  {adType === "product" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="نئی قیمت Rs" value={price} onChange={(e) => setPrice(e.target.value)} />
                      <Input type="number" placeholder="پرانی قیمت Rs" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
                    </div>
                  )}
                  {adType !== "banner" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="نشان (مثلاً 20% OFF)" value={offerBadge} onChange={(e) => setOfferBadge(e.target.value)} />
                      <Input placeholder="پرومو کوڈ (اختیاری)" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
                    </div>
                  )}
                  <Input placeholder="بٹن کا لفظ (مثلاً ابھی خریدیں)" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">تصویر (چوڑی، 2:1 — مثلاً 1200×600)</label>
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setImageFile(f); setPreviewUrl(f ? URL.createObjectURL(f) : ""); }} className="text-sm" />
                    <span className="text-xs text-muted-foreground block mt-1">یا URL لکھیں:</span>
                    <Input placeholder="تصویر URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={!showText} onChange={(e) => setShowText(!e.target.checked)} />
                      تصویر پر پہلے سے لکھائی ہے — اوپر سے الفاظ نہ لکھیں
                    </label>
                  </div>

                  <AdProductPicker onPick={(p) => {
                    setLinkUrl(`/product/${p.id}`);
                    if (!title) setTitle(p.name);
                    if (!brandName && p.store) setBrandName(p.store);
                    if (!imageUrl && !previewUrl && p.image) setImageUrl(p.image);
                    if (p.price && !price) setPrice(String(p.price));
                    toast.success("پروڈکٹ جوڑ دی گئی");
                  }} />
                  <div>
                    <Input placeholder="دبانے پر کہاں جائے؟" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                    <p className="mt-1 text-[11px] text-muted-foreground">ایپ کا صفحہ: /restaurant/... یا /grocery/... — ویب سائٹ: https://... — WhatsApp: https://wa.me/923001234567</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">ایڈ کی جگہ *</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PLACEMENT_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePlacement(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            placements.includes(key) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">پیکیج</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                      <option value="">بغیر پیکیج</option>
                      {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} — Rs {pkg.price_per_month}/ماہ</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">شروع</label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">ختم</label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">ادائیگی سٹیٹس</label>
                      <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                        <option value="pending">زیر التواء</option>
                        <option value="paid">ادا شدہ</option>
                        <option value="expired">معیاد ختم</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">رقم (Rs)</label>
                      <Input type="number" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                  </div>

                  <Button className="w-full" onClick={saveAd}>{editId ? "اپڈیٹ کریں" : "شامل کریں"}</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">کوئی ایڈ نہیں — اوپر "نئی ایڈ" سے شامل کریں</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تصویر</TableHead>
                    <TableHead>ٹائٹل / برانڈ</TableHead>
                    <TableHead>جگہیں</TableHead>
                    <TableHead>مدت</TableHead>
                    <TableHead>ادائیگی</TableHead>
                    <TableHead>نتائج</TableHead>
                    <TableHead>سٹیٹس</TableHead>
                    <TableHead>ایکشنز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        {ad.image_url ? (
                          <img src={ad.image_url} alt={ad.title} className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 bg-secondary rounded flex items-center justify-center text-xs text-muted-foreground">No img</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-sm">{ad.title}</p>
                        <p className="text-xs text-muted-foreground">{ad.brand_name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ad.placements?.map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[10px]">{PLACEMENT_LABELS[p] || p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ad.start_date} → {ad.end_date}
                      </TableCell>
                      <TableCell>
                        <Badge className={ad.payment_status === "paid" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                          {ad.payment_status === "paid" ? "ادا شدہ" : ad.payment_status === "expired" ? "ختم" : "زیر التواء"}
                        </Badge>
                        <p className="text-xs mt-0.5">Rs {ad.payment_amount}</p>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <p>👁 {ad.impressions ?? 0}</p>
                        <p>👆 {ad.clicks ?? 0}</p>
                        <p className="text-muted-foreground">{ad.impressions ? ((100 * (ad.clicks || 0)) / ad.impressions).toFixed(1) : "0"}%</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={ad.is_active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                          {ad.is_active ? "فعال" : "غیر فعال"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => editAd(ad)}>✏️</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => toggleActive(ad.id, ad.is_active)}>
                            {ad.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteAd(ad.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdsTab;
