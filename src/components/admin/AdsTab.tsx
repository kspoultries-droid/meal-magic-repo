import { tr } from "@/lib/i18n/tr";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdSlide } from "@/components/PromotionalAds";
import AdProductPicker from "@/components/admin/AdProductPicker";
import { adDiscount, prepareAdImage, validAdLink, verifyAdImage, type AdSelection } from "@/lib/adCreative";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ChevronLeft, ChevronRight, Upload, Trash2, RefreshCw, Megaphone, Eye, EyeOff, Package } from "lucide-react";

const PLACEMENT_LABELS: Record<string, string> = {
  home: tr("🏠 Home", "🏠 ہوم پیج"),
  grocery: tr("🛒 Grocery", "🛒 گروسری"),
  restaurant: tr("🍔 Restaurant", "🍔 ریسٹورنٹ"),
  services: tr("🔧 Services", "🔧 سروسز"),
  checkout: tr("💳 Checkout", "💳 چیک آؤٹ"),
  bazar_top: tr("📦 Market Top Banner (15)", "📦 بازار ٹاپ بینر (15)"),
  bazar: tr("📦 Market Mid Ad", "📦 بازار درمیانی ایڈ"),
};

const AD_TYPES: Record<string, { label: string; hint: string; cta: string }> = {
  banner: { label: tr("🏢 Brand Campaign", "🏢 برانڈ کیمپین"), hint: tr("e.g. JazzCash, Coca-Cola — brand awareness only", "مثلاً JazzCash، Coca-Cola — صرف برانڈ کی تشہیر"), cta: tr("Learn More", "مزید جانیں") },
  product: { label: tr("🛍️ Single Product", "🛍️ ایک پروڈکٹ"), hint: tr("With photo and price for a single item", "کسی ایک چیز کی قیمت اور تصویر کے ساتھ"), cta: tr("Buy Now", "ابھی خریدیں") },
  offer: { label: tr("🏷️ Discount / Offer", "🏷️ ڈسکاؤنٹ / آفر"), hint: tr("e.g. 20% OFF or promo code", "مثلاً 20% OFF یا پرومو کوڈ"), cta: tr("Claim Offer", "آفر حاصل کریں") },
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
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [formError, setFormError] = useState("");
  const saveLock = useRef(false);
  const imageVersion = useRef(0);
  const discount = adDiscount(price, originalPrice);
  const effectiveBadge = discount || offerBadge;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

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
    imageVersion.current += 1; setPreparing(false); setStep(1); setFormError("");
    setTitle(""); setBrandName(""); setImageUrl(""); setLinkUrl("");
    setPlacements(["home"]); setPackageId(""); setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(""); setPaymentStatus("pending"); setPaymentAmount(""); setImageFile(null); setEditId(null);
    setAdType("banner"); setSubtitle(""); setCtaText(""); setOfferBadge(""); setPromoCode("");
    setPrice(""); setOriginalPrice(""); setShowText(true); setPreviewUrl("");
  };

  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    const version = ++imageVersion.current;
    setPreparing(true); setFormError("");
    try {
      const prepared = await prepareAdImage(file);
      if (version !== imageVersion.current) return;
      setImageFile(prepared); setPreviewUrl(URL.createObjectURL(prepared));
    } catch (e) {
      if (version === imageVersion.current) setFormError(e instanceof Error ? e.message : tr("Image preparation failed", "تصویر تیار نہیں ہو سکی"));
    } finally { if (version === imageVersion.current) setPreparing(false); }
  };

  const pick = (selection: AdSelection, product: boolean) => {
    imageVersion.current += 1; setPreparing(false); setImageFile(null); setPreviewUrl("");
    setBrandName(selection.brand); setTitle(selection.name); setImageUrl(selection.image || "");
    setLinkUrl(selection.link); setPrice(selection.price == null ? "" : String(selection.price));
    setOriginalPrice(selection.originalPrice == null ? "" : String(selection.originalPrice));
    setOfferBadge(""); setPromoCode(""); setSubtitle(""); setShowText(true);
    setAdType(product ? "product" : "banner");
    setCtaText(product ? tr("View item", "چیز دیکھیں") : tr("View shop", "دکان دیکھیں"));
    setPlacements(["home", selection.placement]); setFormError("");
  };

  const next = () => {
    if (step === 1 && (!title.trim() || !brandName.trim())) { setFormError(tr("Select a business or enter its name and title", "کاروبار منتخب کریں یا نام اور عنوان لکھیں")); return; }
    if (step === 2 && (!imageFile && !imageUrl.trim())) { setFormError(tr("An image is required", "تصویر ضروری ہے")); return; }
    setFormError(""); setStep(s => Math.min(3, s + 1));
  };

  const saveAd = async () => {
    if (saveLock.current || preparing) return;
    if (!title.trim() || !brandName.trim()) { setStep(1); setFormError(tr("Title and brand name are required", "عنوان اور کاروبار کا نام ضروری ہے")); return; }
    if (!imageFile && !imageUrl.trim()) { setStep(2); setFormError(tr("An image is required", "تصویر ضروری ہے")); return; }
    if (!validAdLink(linkUrl.trim())) { setStep(2); setFormError(tr("Use an app path or HTTPS link", "ایپ کا درست ربط یا HTTPS لنک لکھیں")); return; }
    if (!placements.length) { setFormError(tr("Select at least one location", "کم از کم ایک جگہ منتخب کریں")); return; }
    if (!startDate || (endDate && endDate < startDate)) { setFormError(tr("End date must not precede start date", "اختتامی تاریخ شروع سے پہلے نہیں ہو سکتی")); return; }
    if ([price, originalPrice, paymentAmount].some(v => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0))) { setFormError(tr("Enter valid non-negative amounts", "درست غیر منفی رقم لکھیں")); return; }
    saveLock.current = true; setSaving(true); setFormError("");
    try {
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        const path = `ads/${crypto.randomUUID()}.${imageFile.type === "image/webp" ? "webp" : "png"}`;
        const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { contentType: imageFile.type });
        if (error) throw new Error(tr("Image upload failed: ", "تصویر اپلوڈ ناکام: ") + error.message);
        finalImageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        // Retain an uploaded asset when the subsequent record save fails; retry does not upload it twice.
        setImageUrl(finalImageUrl); setImageFile(null);
      }
      await verifyAdImage(finalImageUrl);
      const adData = {
        title: title.trim(), brand_name: brandName.trim(), image_url: finalImageUrl,
        link_url: linkUrl.trim() || null, placements, package_id: packageId || null,
        start_date: startDate,
        end_date: endDate || new Date(new Date(startDate).getTime() + 30 * 86400000).toISOString().split("T")[0],
        payment_status: paymentStatus, payment_amount: Number(paymentAmount) || 0,
        ad_type: adType, subtitle: subtitle || null, cta_text: ctaText || null,
        offer_badge: effectiveBadge || null, promo_code: promoCode.trim().toUpperCase() || null,
        price: price === "" ? null : Number(price), original_price: originalPrice === "" ? null : Number(originalPrice), show_text: showText,
      };
      const { error } = editId
        ? await supabase.from("promotional_ads").update(adData).eq("id", editId)
        : await supabase.from("promotional_ads").insert(adData);
      if (error) throw error;
      toast.success(editId ? tr("Ad updated!", "اشتہار اپڈیٹ ہو گیا!") : tr("Ad saved!", "اشتہار محفوظ ہو گیا!"));
      resetForm(); setDialogOpen(false); void fetchData();
    } catch (e) { setFormError(e && typeof e === "object" && "message" in e ? String(e.message) : tr("Could not save the ad", "اشتہار محفوظ نہیں ہو سکا")); }
    finally { saveLock.current = false; setSaving(false); }
  };

  const editAd = (ad: any) => {
    resetForm();
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
    toast.success(!current ? tr("Ad activated", "ایڈ فعال ہو گئی") : tr("Ad deactivated", "ایڈ غیر فعال ہو گئی"));
    fetchData();
  };

  const deleteAd = async (id: string) => {
    if (!confirm(tr("Are you sure you want to delete this ad?", "کیا آپ واقعی یہ ایڈ حذف کرنا چاہتے ہیں؟"))) return;
    await supabase.from("promotional_ads").delete().eq("id", id);
    toast.success(tr("Ad deleted", "ایڈ حذف ہو گئی"));
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Ad Packages */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap gap-2 items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="w-5 h-5" /> {tr("Ad Packages / Rates", "ایڈ پیکیجز / ریٹس")}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowPackages(!showPackages)}>
            {showPackages ? tr("Hide ▲", "چھپائیں ▲") : tr("View ▼", "دیکھیں ▼")}
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
                    <p>{tr("📅 Daily:", "📅 روزانہ:")} <strong>Rs {pkg.price_per_day}</strong></p>
                    <p>{tr("📅 Weekly:", "📅 ہفتہ وار:")} <strong>Rs {pkg.price_per_week}</strong></p>
                    <p>{tr("📅 Monthly:", "📅 ماہانہ:")} <strong>Rs {pkg.price_per_month}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ads Management */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap gap-2 items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> {tr("Promotional Ads", "پروموشنل ایڈز")}</CardTitle>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (saveLock.current) return; setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{tr("New Ad", "نئی ایڈ")}</Button></DialogTrigger>
              <DialogContent className="w-[calc(100%-24px)] max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6" onEscapeKeyDown={e => { if (saving) e.preventDefault(); }} onInteractOutside={e => { if (saving) e.preventDefault(); }}>
                <DialogHeader className="text-start pe-8">
                  <DialogTitle>{editId ? tr("Edit Ad", "اشتہار میں ترمیم") : tr("New Advertisement", "نیا اشتہار")}</DialogTitle>
                  <DialogDescription className="sr-only">{tr("Advertisement details", "اشتہار کی تفصیل")}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-1 border-b pb-3">
                  {[tr("1 · Business", "1 · کاروبار"), tr("2 · Image & offer", "2 · تصویر اور آفر"), tr("3 · Placement", "3 · جگہ")].map((label, i) => <Button key={i} variant={step === i + 1 ? "secondary" : "ghost"} size="sm" className="h-auto min-h-9 whitespace-normal text-xs px-1" disabled={saving || preparing || i + 1 > step} onClick={() => { setStep(i + 1); setFormError(""); }} aria-current={step === i + 1 ? "step" : undefined}>{label}</Button>)}
                </div>
                <fieldset disabled={saving} className="min-w-0 space-y-4">
                  {step === 1 && <>
                    <AdProductPicker onPick={pick} />
                    <div className="border-t pt-3 space-y-3">
                      <div><Label htmlFor="ad-brand">{tr("Business name", "کاروبار کا نام")}</Label><Input id="ad-brand" value={brandName} onChange={e => setBrandName(e.target.value)} /></div>
                      <div><Label htmlFor="ad-title">{tr("Title", "عنوان")}</Label><Input id="ad-title" value={title} onChange={e => setTitle(e.target.value)} /></div>
                      <Label>{tr("Ad type", "اشتہار کی قسم")}</Label>
                      <div className="flex flex-wrap gap-2">{Object.entries(AD_TYPES).map(([key, t]) => <Button key={key} variant={adType === key ? "default" : "outline"} size="sm" aria-pressed={adType === key} onClick={() => { setAdType(key); setCtaText(t.cta); }}>{t.label}</Button>)}</div>
                    </div>
                  </>}
                  {step === 2 && <>
                    <AdSlide ad={{ id: "preview", title, brand_name: brandName, image_url: previewUrl || imageUrl || null, link_url: linkUrl || null, sort_order: 0, ad_type: adType, subtitle, cta_text: ctaText, offer_badge: effectiveBadge, promo_code: promoCode, price: price === "" ? null : Number(price), original_price: originalPrice === "" ? null : Number(originalPrice), show_text: showText }} eager />
                    <div className="space-y-2"><Label htmlFor="ad-image" className="flex items-center gap-2"><Upload className="size-4" />{tr("Image · 2:1", "تصویر · 2:1")}</Label><Input id="ad-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={preparing} onChange={e => { void chooseImage(e.target.files?.[0]); e.target.value = ""; }} />{preparing && <p role="status" className="text-sm text-muted-foreground">{tr("Preparing image…", "تصویر تیار ہو رہی ہے…")}</p>}
                      {imageFile && <p className="text-xs text-muted-foreground" dir="ltr">{imageFile.name} · {Math.ceil(imageFile.size / 1024)} KB</p>}
                      <Label htmlFor="ad-image-url">{tr("Image URL", "تصویر کا URL")}</Label><Input id="ad-image-url" dir="ltr" value={imageUrl} disabled={preparing} onChange={e => { setImageUrl(e.target.value); setImageFile(null); setPreviewUrl(""); }} />
                      <Label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={!showText} onChange={e => setShowText(!e.target.checked)} />{tr("Image contains its own text", "تصویر پر پہلے سے تحریر ہے")}</Label>
                    </div>
                    {adType !== "banner" && <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="ad-price">{tr("Offer price (Rs)", "آفر قیمت (Rs)")}</Label><Input id="ad-price" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></div><div><Label htmlFor="ad-original">{tr("Original price (Rs)", "اصل قیمت (Rs)")}</Label><Input id="ad-original" type="number" min="0" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} /></div><div><Label htmlFor="ad-badge">{tr("Offer badge", "آفر کا نشان")}</Label><Input id="ad-badge" value={effectiveBadge} disabled={!!discount} onChange={e => setOfferBadge(e.target.value)} /></div><div><Label htmlFor="ad-code">{tr("Promo code", "پرومو کوڈ")}</Label><Input id="ad-code" value={promoCode} onChange={e => setPromoCode(e.target.value)} /></div></div>}
                    <div><Label htmlFor="ad-subtitle">{tr("Subtitle", "ذیلی عنوان")}</Label><Input id="ad-subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
                    <div><Label htmlFor="ad-cta">{tr("Button text", "بٹن کی تحریر")}</Label><Input id="ad-cta" value={ctaText} onChange={e => setCtaText(e.target.value)} /></div>
                    <div><Label htmlFor="ad-link">{tr("Destination", "اشتہار کا ربط")}</Label><Input id="ad-link" dir="ltr" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} /></div>
                  </>}
                  {step === 3 && <>
                    <Label>{tr("Placement", "اشتہار کی جگہ")}</Label><div className="flex flex-wrap gap-2">{Object.entries(PLACEMENT_LABELS).map(([key, label]) => <Button key={key} size="sm" variant={placements.includes(key) ? "default" : "outline"} aria-pressed={placements.includes(key)} onClick={() => togglePlacement(key)}>{label}</Button>)}</div>
                    <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="ad-start">{tr("Start", "شروع")}</Label><Input id="ad-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><div><Label htmlFor="ad-end">{tr("End", "ختم")}</Label><Input id="ad-end" type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} /></div></div>
                    <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">{tr("Package & payment record", "پیکیج اور ادائیگی کا ریکارڈ")}</summary><div className="mt-3 space-y-3"><Label htmlFor="ad-package">{tr("Package", "پیکیج")}</Label><select id="ad-package" className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={packageId} onChange={e => setPackageId(e.target.value)}><option value="">{tr("No package", "بغیر پیکیج")}</option>{packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} — Rs {pkg.price_per_month}</option>)}</select><Label htmlFor="ad-payment">{tr("Payment status", "ادائیگی کی حالت")}</Label><select id="ad-payment" className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}><option value="pending">{tr("Pending", "زیرِ التواء")}</option><option value="paid">{tr("Paid", "ادا شدہ")}</option><option value="expired">{tr("Expired", "مدت ختم")}</option></select><Label htmlFor="ad-amount">{tr("Amount (Rs)", "رقم (Rs)")}</Label><Input id="ad-amount" type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div></details>
                  </>}
                </fieldset>
                {formError && <p role="alert" className="text-sm text-destructive break-words">{formError}</p>}
                <div className="sticky bottom-0 flex justify-between gap-3 border-t bg-background pt-3">
                  <Button variant="outline" disabled={saving || preparing} onClick={() => step > 1 ? setStep(s => s - 1) : (resetForm(), setDialogOpen(false))}><ChevronLeft className="size-4 me-1" />{step > 1 ? tr("Back", "واپس") : tr("Cancel", "منسوخ")}</Button>
                  {step < 3 ? <Button disabled={preparing || saving} onClick={next}>{tr("Next", "اگلا")}<ChevronRight className="size-4 ms-1" /></Button> : <Button disabled={saving || preparing} onClick={() => void saveAd()}>{saving && <Loader2 className="size-4 me-1 animate-spin" />}{saving ? tr("Saving…", "محفوظ ہو رہا ہے…") : editId ? tr("Update ad", "اشتہار اپڈیٹ کریں") : tr("Save ad", "اشتہار محفوظ کریں")}</Button>}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tr("No ads — add via \"New Ad\" above", "کوئی ایڈ نہیں — اوپر \"نئی ایڈ\" سے شامل کریں")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("Image", "تصویر")}</TableHead>
                    <TableHead>{tr("Title / Brand", "ٹائٹل / برانڈ")}</TableHead>
                    <TableHead>{tr("Locations", "جگہیں")}</TableHead>
                    <TableHead>{tr("Duration", "مدت")}</TableHead>
                    <TableHead>{tr("Payment", "ادائیگی")}</TableHead>
                    <TableHead>{tr("Results", "نتائج")}</TableHead>
                    <TableHead>{tr("Status", "سٹیٹس")}</TableHead>
                    <TableHead>{tr("Actions", "ایکشنز")}</TableHead>
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
                          {ad.payment_status === "paid" ? tr("Paid", "ادا شدہ") : ad.payment_status === "expired" ? tr("End", "ختم") : tr("Pending", "زیر التواء")}
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
                          {ad.is_active ? tr("Active", "فعال") : tr("Inactive", "غیر فعال")}
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
