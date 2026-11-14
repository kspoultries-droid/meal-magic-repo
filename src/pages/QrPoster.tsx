import { useSearchParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Printer } from "lucide-react";

const SITE = "https://easylife.apnahub.online";

/** Printable counter poster: QR opens the shop page (with app install link). */
const QrPoster = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const name = params.get("name") || "Easy Life";
  const path = params.get("path") || "/install";
  const url = SITE + (path.startsWith("/") ? path : "/" + path);

  return (
    <div className="min-h-screen bg-muted p-4 print:bg-background print:p-0">
      <div className="mx-auto mb-4 flex max-w-[600px] gap-2 print:hidden">
        <Button variant="outline" onClick={() => (window.history.length > 1 && window.history.state?.idx > 0 ? navigate(-1) : navigate(path.startsWith("/") ? path : "/"))}><ArrowLeft className="mr-1 h-4 w-4" />{tr("Back", "واپس")}</Button>
        <Button variant="outline" onClick={() => navigate("/")}><Home className="mr-1 h-4 w-4" />{tr("Home", "ہوم")}</Button>
        <Button className="flex-1" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />{tr("Print poster", "پوسٹر پرنٹ کریں")}</Button>
      </div>
      <div className="mx-auto flex max-w-[600px] flex-col items-center rounded-3xl border-8 border-primary bg-card p-8 text-center print:min-h-screen print:rounded-none">
        <p className="text-2xl font-extrabold text-primary">Easy Life</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight">{name}</h1>
        <p className="mt-6 text-3xl font-bold leading-relaxed" dir="rtl">لائن میں کھڑے ہونے کی ضرورت نہیں!</p>
        <p className="mt-2 text-2xl leading-relaxed" dir="rtl">گھر بیٹھے آرڈر کریں — ہوم ڈیلیوری</p>
        <div className="my-8 rounded-2xl bg-background p-4 shadow-lg">
          <QRCodeSVG value={url} size={280} level="M" />
        </div>
        <p className="text-xl font-bold" dir="rtl">QR کوڈ اسکین کریں اور ایپ ڈاؤن لوڈ کریں</p>
        <p className="mt-1 text-lg text-muted-foreground">Scan to order from home</p>
        <p className="mt-4 text-sm text-muted-foreground" dir="ltr">{url}</p>
      </div>
    </div>
  );
};
export default QrPoster;
