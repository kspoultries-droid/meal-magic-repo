import { tr } from "@/lib/i18n/tr";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { captureRefFromUrl, getStoredRef } from "@/lib/referral";

const APK_URL = "https://github.com/kspoultries-droid/meal-magic-repo/releases/latest/download/EasyLife.apk";

const Install = () => {
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    captureRefFromUrl();
    setRef(getStoredRef());
  }, []);

  const platform = useMemo(() => {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "other";
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      toast.success(tr("Code copied", "کوڈ کاپی ہو گیا"));
    } catch {
      toast.error(tr("Failed to copy — write down the code", "کاپی نہیں ہوا — کوڈ لکھ لیں"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {tr("Back", "واپس")}
          </Button>
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{tr("Easy Life App", "Easy Life ایپ")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ref && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{tr("Your friend's code — Use when signing up to get Rs 50 reward on your first order", "آپ کے دوست کا کوڈ — اکاؤنٹ بناتے وقت لگائیں، پہلے آرڈر پر Rs 50 انعام")}</p>
              <p className="text-3xl font-bold tracking-widest text-primary" dir="ltr">{ref}</p>
              <Button variant="outline" className="w-full" onClick={copyCode}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {tr("Copy Code", "کوڈ کاپی کریں")}
              </Button>
            </div>
          )}

          {platform === "ios" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary text-sm space-y-1">
                <p className="font-semibold">{tr("🍎 For iPhone", "🍎 آئی فون کے لیے")}</p>
                <p className="text-muted-foreground">{tr("Tap the Share button in Safari → \"Add to Home Screen\" — The app icon will be added to your home screen.", "Safari میں Share بٹن دبائیں → \"Add to Home Screen\" — ایپ کا آئیکن ہوم اسکرین پر آ جائے گا۔")}</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/auth")}>
                {tr("Create Account / Order Now", "اکاؤنٹ بنائیں / آرڈر کریں")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <a href={APK_URL}>
                  <Download className="w-5 h-5 mr-2" /> {tr("Download App (Android)", "ایپ ڈاؤن لوڈ کریں (Android)")}
                </a>
              </Button>
              <p className="text-muted-foreground text-xs text-center">
                {tr("Once the download is complete, tap the file and", "ڈاؤن لوڈ مکمل ہو تو فائل پر ٹیپ کریں اور")} <b>Install</b> {tr("press. If the phone prompts for permission, tap \"Allow\".", "دبائیں۔ فون اجازت مانگے تو \"Allow\" کر دیں۔")}
                {ref && tr("Open the app and paste the code above while creating your account.", " ایپ کھول کر اکاؤنٹ بناتے وقت اوپر والا کوڈ paste کریں۔")}
              </p>
              {platform === "other" && (
                <p className="text-muted-foreground text-xs text-center">{tr("iPhone users: open this page in Safari and select \"Add to Home Screen\".", "آئی فون والے یہ صفحہ Safari میں کھول کر \"Add to Home Screen\" کریں۔")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
