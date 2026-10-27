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
      toast.success("کوڈ کاپی ہو گیا");
    } catch {
      toast.error("کاپی نہیں ہوا — کوڈ لکھ لیں");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> واپس
          </Button>
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Easy Life ایپ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ref && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <p className="text-sm text-muted-foreground">آپ کے دوست کا کوڈ — اکاؤنٹ بناتے وقت لگائیں، پہلے آرڈر پر Rs 50 انعام</p>
              <p className="text-3xl font-bold tracking-widest text-primary" dir="ltr">{ref}</p>
              <Button variant="outline" className="w-full" onClick={copyCode}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                کوڈ کاپی کریں
              </Button>
            </div>
          )}

          {platform === "ios" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary text-sm space-y-1">
                <p className="font-semibold">🍎 آئی فون کے لیے</p>
                <p className="text-muted-foreground">Safari میں Share بٹن دبائیں → "Add to Home Screen" — ایپ کا آئیکن ہوم اسکرین پر آ جائے گا۔</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/auth")}>
                اکاؤنٹ بنائیں / آرڈر کریں
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <a href={APK_URL}>
                  <Download className="w-5 h-5 mr-2" /> ایپ ڈاؤن لوڈ کریں (Android)
                </a>
              </Button>
              <p className="text-muted-foreground text-xs text-center">
                ڈاؤن لوڈ مکمل ہو تو فائل پر ٹیپ کریں اور <b>Install</b> دبائیں۔ فون اجازت مانگے تو "Allow" کر دیں۔
                {ref && " ایپ کھول کر اکاؤنٹ بناتے وقت اوپر والا کوڈ paste کریں۔"}
              </p>
              {platform === "other" && (
                <p className="text-muted-foreground text-xs text-center">آئی فون والے یہ صفحہ Safari میں کھول کر "Add to Home Screen" کریں۔</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
