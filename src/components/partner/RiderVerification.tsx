import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Fingerprint, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import CameraCapture from "./CameraCapture";

export interface RiderKycState {
  verified: boolean;
  status: string;
  biometric: boolean;
  cnicFrontPath: string | null;
  cnicBackPath: string | null;
  selfiePath: string | null;
  bikePath: string | null;
  platePath: string | null;
}

interface Props {
  cnic: string;
  fullName: string;
  address: string;
  onChange: (state: RiderKycState) => void;
}

const BUCKET = "partner-documents";

const RiderVerification = ({ cnic, fullName, address, onChange }: Props) => {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [bike, setBike] = useState<File | null>(null);
  const [plate, setPlate] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [result, setResult] = useState<{ status: string; score: number; reasons: string[]; checks: Record<string, boolean> } | null>(null);
  const [paths, setPaths] = useState<Record<string, string | null>>({ front: null, back: null, selfie: null, bike: null, plate: null });

  useEffect(() => {
    onChange({
      verified: result?.status === "verified" || result?.status === "manual_review",
      status: result?.status ?? "none",
      biometric,
      cnicFrontPath: paths.front,
      cnicBackPath: paths.back,
      selfiePath: paths.selfie,
      bikePath: paths.bike,
      platePath: paths.plate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, biometric, paths]);

  // Any re-capture invalidates a previous verification
  useEffect(() => { setResult(null); }, [front, back, selfie]);

  const upload = async (file: File, name: string) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) throw new Error("پہلے لاگ ان کریں");
    const path = `${uid}/kyc/${name}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
    return path;
  };

  const runVerification = async () => {
    if (!front || !back || !selfie) { toast.error("شناختی کارڈ کے دونوں رخ اور سیلفی لازمی ہیں"); return; }
    if (!bike || !plate) { toast.error("بائیک اور نمبر پلیٹ کی تصویر لازمی ہے"); return; }
    if (cnic.replace(/\D/g, "").length !== 13) { toast.error("شناختی کارڈ نمبر 13 ہندسوں کا لکھیں"); return; }
    if (!fullName.trim() || address.trim().length < 10) { toast.error("پورا نام اور مکمل پتہ لکھیں"); return; }

    setBusy(true);
    try {
      const [fp, bp, sp, bkp, plp] = await Promise.all([
        upload(front, "cnic-front"),
        upload(back, "cnic-back"),
        upload(selfie, "selfie"),
        upload(bike, "bike"),
        upload(plate, "plate"),
      ]);
      setPaths({ front: fp, back: bp, selfie: sp, bike: bkp, plate: plp });

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-rider-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          front_path: fp, back_path: bp, selfie_path: sp,
          cnic, full_name: fullName, address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تصدیق ناکام");
      setResult(data);
      if (data.status === "verified") toast.success("تصدیق مکمل ✅");
      else if (data.status === "manual_review") toast("جزوی تصدیق — ایڈمن دستی جائزہ لے گا");
      else toast.error("تصدیق ناکام — تفصیل نیچے دیکھیں");
    } catch (e: any) {
      toast.error(e.message || "تصدیق ناکام");
    } finally {
      setBusy(false);
    }
  };

  const registerBiometric = async () => {
    setBioBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("پہلے لاگ ان کریں");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const optRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/register-options`, {
        method: "POST", headers, body: JSON.stringify({}),
      });
      const opt = await optRes.json();
      if (opt.error) throw new Error(opt.error);
      const credential = await startRegistration({ optionsJSON: opt });
      const vRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/register-verify`, {
        method: "POST", headers, body: JSON.stringify({ credential, deviceName: "Rider Device" }),
      });
      const v = await vRes.json();
      if (v.error) throw new Error(v.error);
      setBiometric(true);
      toast.success("فنگر پرنٹ رجسٹر ہو گیا 👆");
    } catch (e: any) {
      toast.error(e.name === "NotAllowedError" ? "فنگر پرنٹ منسوخ ہو گیا" : e.message || "بایومیٹرک ناکام");
    } finally {
      setBioBusy(false);
    }
  };

  const checkRow = (ok: boolean, label: string) => (
    <div key={label} className="flex items-center gap-2 text-[11px]">
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
      <span className={ok ? "text-foreground" : "text-destructive"}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> رائیڈر تصدیق (لازمی)</p>
        <p>تمام تصاویر صرف لائیو کیمرے سے لی جائیں گی — گیلری سے اپلوڈ ممکن نہیں۔ شناختی کارڈ اصل، غیر منقضی اور آپ کے چہرے سے میل کھاتا ہونا چاہیے۔ ایک شناختی کارڈ پر صرف ایک رائیڈر اکاؤنٹ بن سکتا ہے۔</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <CameraCapture label="شناختی کارڈ — سامنے" hint="تصویر والا رخ، پورا کارڈ فریم میں" value={front} onCapture={setFront} />
        <CameraCapture label="شناختی کارڈ — پیچھے" hint="پتہ اور میعاد والا رخ" value={back} onCapture={setBack} />
        <CameraCapture label="لائیو سیلفی" hint="سیدھا کیمرے کی طرف دیکھیں، اچھی روشنی میں" facing="user" value={selfie} onCapture={setSelfie} />
        <div className="grid grid-cols-2 gap-3">
          <CameraCapture label="بائیک/گاڑی" value={bike} onCapture={setBike} />
          <CameraCapture label="نمبر پلیٹ" value={plate} onCapture={setPlate} />
        </div>
      </div>

      <Button type="button" className="w-full" onClick={runVerification} disabled={busy}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> تصدیق ہو رہی ہے…</> : <><ShieldCheck className="w-4 h-4 mr-2" /> شناخت کی تصدیق کریں</>}
      </Button>

      {result && (
        <div className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">نتیجہ</span>
            <Badge variant={result.status === "verified" ? "default" : result.status === "manual_review" ? "secondary" : "destructive"}>
              {result.status === "verified" ? "تصدیق شدہ" : result.status === "manual_review" ? "دستی جائزہ" : "ناکام"} — {result.score}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {checkRow(result.checks.documents_ok, "کارڈ اصل")}
            {checkRow(result.checks.cnic_match, "نمبر میچ")}
            {checkRow(result.checks.expiry_valid, "میعاد باقی")}
            {checkRow(result.checks.face_match, "چہرہ میچ")}
            {checkRow(result.checks.liveness_ok, "لائیو سیلفی")}
            {checkRow(result.checks.address_match, "پتہ میچ")}
          </div>
          {result.reasons?.length > 0 && (
            <p className="text-[11px] text-destructive flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{result.reasons.join("، ")}</p>
          )}
        </div>
      )}

      <Button type="button" variant={biometric ? "secondary" : "outline"} className="w-full" onClick={registerBiometric} disabled={bioBusy || biometric}>
        {bioBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
        {biometric ? "فنگر پرنٹ رجسٹرڈ ✓" : "فنگر پرنٹ / بایومیٹرک رجسٹر کریں *"}
      </Button>
    </div>
  );
};

export default RiderVerification;
