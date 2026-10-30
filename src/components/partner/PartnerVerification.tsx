import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MapPin, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import CameraCapture from "./CameraCapture";

export interface PartnerKycState {
  kycOk: boolean;
  shopPath: string | null;
  chequePath: string | null;
  lat: number | null;
  lng: number | null;
  payout: { payout_method: string; bank_name: string; account_title: string; account_number: string };
}

interface Props { cnic: string; fullName: string; address: string; onChange: (s: PartnerKycState) => void }

const BUCKET = "partner-documents";

async function upload(file: File, name: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("پہلے لاگ ان کریں");
  const path = `${u.user.id}/kyc/${name}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

const Step = ({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) => (
  <section className="rounded-xl border bg-card p-3 space-y-3">
    <h3 className="flex items-center gap-2 text-sm font-bold">
      <span className={`grid size-6 place-items-center rounded-full text-xs ${done ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {done ? <CheckCircle2 className="size-4" /> : n}
      </span>
      {title}
    </h3>
    {children}
  </section>
);

const PartnerVerification = ({ cnic, fullName, address, onChange }: Props) => {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [shop, setShop] = useState<File | null>(null);
  const [cheque, setCheque] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; reasons: string[] } | null>(null);
  const [shopPath, setShopPath] = useState<string | null>(null);
  const [chequePath, setChequePath] = useState<string | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [payout, setPayout] = useState({ payout_method: "", bank_name: "", account_title: "", account_number: "" });

  useEffect(() => { setResult(null); }, [front, back, selfie]);
  useEffect(() => {
    onChange({
      kycOk: result?.status === "verified" || result?.status === "manual_review",
      shopPath, chequePath, lat: loc?.lat ?? null, lng: loc?.lng ?? null, payout,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, shopPath, chequePath, loc, payout]);

  const verify = async () => {
    if (!front || !back || !selfie) return toast.error("کارڈ کے دونوں رخ اور لائیو سیلفی لیں");
    if (cnic.replace(/\D/g, "").length !== 13) return toast.error("اوپر 13 ہندسوں کا شناختی کارڈ نمبر لکھیں");
    if (!fullName.trim() || address.trim().length < 10) return toast.error("اوپر مالک کا نام اور مکمل پتہ لکھیں");
    setBusy(true);
    try {
      const [fp, bp, sp] = await Promise.all([upload(front, "p-cnic-front"), upload(back, "p-cnic-back"), upload(selfie, "p-selfie")]);
      const { data, error } = await supabase.functions.invoke("verify-rider-id", {
        body: { front_path: fp, back_path: bp, selfie_path: sp, cnic, full_name: fullName, address, purpose: "partner" },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* keep */ }
        throw new Error(msg);
      }
      setResult(data);
      if (data.status === "verified") toast.success("شناخت کی تصدیق مکمل");
      else if (data.status === "manual_review") toast("جزوی تصدیق — ایڈمن دستی جائزہ لے گا");
      else toast.error("تصدیق ناکام — صاف تصاویر دوبارہ لیں");
    } catch (e: any) {
      toast.error(e.message || "تصدیق ناکام");
    } finally { setBusy(false); }
  };

  const saveFile = async (file: File | null, name: string, set: (p: string | null) => void) => {
    if (!file) { set(null); return; }
    try { set(await upload(file, name)); } catch (e: any) { toast.error("تصویر محفوظ نہیں ہوئی: " + e.message); }
  };

  const getLocation = () => {
    if (!navigator.geolocation) return toast.error("اس فون پر لوکیشن دستیاب نہیں");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("دکان کی جگہ محفوظ ہو گئی"); },
      () => toast.error("لوکیشن کی اجازت دیں اور دکان پر کھڑے ہو کر دوبارہ دبائیں"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const isBank = payout.payout_method === "bank";
  const ok = result?.status === "verified" || result?.status === "manual_review";

  return (
    <div className="space-y-3">
      <Step n={2} title="شناخت: شناختی کارڈ اور لائیو سیلفی" done={ok}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <CameraCapture label="کارڈ کا اگلا رخ" value={front} onCapture={setFront} />
          <CameraCapture label="کارڈ کا پچھلا رخ" value={back} onCapture={setBack} />
          <CameraCapture label="لائیو سیلفی" hint="چہرہ صاف، روشنی میں" facing="user" value={selfie} onCapture={setSelfie} />
        </div>
        <Button type="button" variant={ok ? "outline" : "default"} className="w-full" onClick={verify} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {ok ? "تصدیق ہو چکی — دوبارہ کریں" : "شناخت کی تصدیق کریں"}
        </Button>
        {result && !ok && (
          <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="inline size-3" /> {result.reasons?.join("، ") || "تصدیق نہیں ہو سکی"}
          </div>
        )}
      </Step>

      <Step n={3} title="دکان: تصویر اور نقشے پر جگہ" done={!!shopPath && !!loc}>
        <CameraCapture label="دکان کی سامنے سے تصویر (بورڈ نظر آئے)" value={shop} onCapture={(f) => { setShop(f); void saveFile(f, "p-shop", setShopPath); }} />
        <Button type="button" variant={loc ? "outline" : "secondary"} className="w-full" onClick={getLocation}>
          <MapPin className="size-4" /> {loc ? `جگہ محفوظ (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : "دکان پر کھڑے ہو کر جگہ محفوظ کریں"}
        </Button>
      </Step>

      <Step n={4} title="ادائیگی کا اکاؤنٹ" done={!!chequePath && payout.account_number.length >= 8 && !!payout.account_title}>
        <p className="text-[11px] text-muted-foreground">آپ کی کمائی اسی اکاؤنٹ میں بھیجی جائے گی۔ اکاؤنٹ کا نام شناختی کارڈ والے نام جیسا ہو۔</p>
        <Select value={payout.payout_method} onValueChange={(v) => setPayout({ ...payout, payout_method: v })}>
          <SelectTrigger><SelectValue placeholder="طریقہ منتخب کریں" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">بینک اکاؤنٹ</SelectItem>
            <SelectItem value="jazzcash">JazzCash</SelectItem>
            <SelectItem value="easypaisa">Easypaisa</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {isBank && <Input placeholder="بینک کا نام" value={payout.bank_name} onChange={(e) => setPayout({ ...payout, bank_name: e.target.value })} />}
          <Input placeholder="اکاؤنٹ ٹائٹل (نام)" value={payout.account_title} onChange={(e) => setPayout({ ...payout, account_title: e.target.value })} />
          <Input placeholder={isBank ? "اکاؤنٹ نمبر / IBAN" : "موبائل والٹ نمبر"} value={payout.account_number} onChange={(e) => setPayout({ ...payout, account_number: e.target.value.trim() })} />
        </div>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">{isBank ? "چیک بک کے صفحے کی تصویر" : "والٹ ایپ کا اسکرین شاٹ جس میں نام اور نمبر نظر آئے"}</span>
          <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setCheque(f); void saveFile(f, "p-cheque", setChequePath); }} />
          {cheque && chequePath && <span className="text-[10px] text-primary">✓ محفوظ</span>}
        </label>
      </Step>
    </div>
  );
};

export default PartnerVerification;
