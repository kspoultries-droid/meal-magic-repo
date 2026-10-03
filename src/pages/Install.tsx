import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, ArrowLeft, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APK_URL = "https://github.com/kspoultries-droid/meal-magic-repo/releases/latest/download/EasyLife.apk";

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
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
          <CardTitle className="text-2xl font-bold">ایپ انسٹال کریں</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground">ایپ پہلے سے انسٹال ہے!</p>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">Quick Bite ایپ اپنے فون میں انسٹال کریں — تیز، آف لائن اور ایپ جیسا تجربہ!</p>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" /> ابھی انسٹال کریں
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">ایپ انسٹال کرنے کے لیے:</p>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary">
                  <p className="font-semibold">🍎 آئی فون (Safari):</p>
                  <p className="text-muted-foreground">Share بٹن دبائیں → "Add to Home Screen" منتخب کریں</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary">
                  <p className="font-semibold">🤖 اینڈرائیڈ (Chrome):</p>
                  <p className="text-muted-foreground">⋮ مینو دبائیں → "Add to Home Screen" یا "Install App" منتخب کریں</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                  <p className="font-semibold">📦 اینڈرائیڈ ایپ (APK):</p>
                  <p className="text-muted-foreground text-xs">اصلی اینڈرائیڈ ایپ — بند ایپ پر بھی نوٹیفکیشن آتے ہیں۔</p>
                  <Button asChild className="w-full" size="lg">
                    <a href={APK_URL}>
                      <Download className="w-5 h-5 mr-2" /> 📲 ایپ ڈاؤن لوڈ کریں (ایک کلک)
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent("Easy Life ایپ ڈاؤن لوڈ کریں: " + APK_URL)}`,
                        "_blank",
                      )
                    }
                  >
                    واٹس ایپ پر بھیجیں
                  </Button>
                  <p className="text-muted-foreground text-xs">ڈاؤن لوڈ مکمل ہو تو فائل پر ٹیپ کریں اور <b>Install</b> دبائیں۔ اگر فون اجازت مانگے تو "Allow" کر دیں۔</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
