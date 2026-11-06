import { tr } from "@/lib/i18n/tr";
import { Camera, Lightbulb, Maximize, Sun, XCircle } from "lucide-react";

const TIPS = [
  { icon: Sun, ur: tr("Take photo in daylight or by a window", "دن کی روشنی یا کھڑکی کے سامنے تصویر لیں"), en: "Use daylight" },
  { icon: XCircle, ur: tr("Turn flash off — glare ruins the product photo", "فلیش بند رکھیں — چمک پروڈکٹ خراب کر دیتی ہے"), en: "Flash off" },
  { icon: Maximize, ur: tr("Place against a plain wall or table, keep background clear", "سادہ دیوار یا میز کے سامنے رکھیں، پیچھے سامان نہ ہو"), en: "Plain background" },
  { icon: Camera, ur: tr("Keep the product in full frame and hold the phone steady", "پروڈکٹ پورا فریم میں ہو اور موبائل مستحکم رکھیں"), en: "Whole product, steady hand" },
  { icon: Lightbulb, ur: tr("Always use original photos of your product — stock images are not allowed", "ہمیشہ اپنی اصل پروڈکٹ کی تصویر لگائیں — انٹرنیٹ سے لی گئی تصویر ممنوع ہے"), en: "Real product only" },
];

const PhotoTips = () => (
  <div className="rounded-xl border border-border/70 bg-accent/40 p-3">
    <p className="mb-2 text-xs font-extrabold text-foreground">{tr("How to take a good photo? / How to shoot", "اچھی تصویر کیسے لیں؟ / How to shoot")}</p>
    <ul className="space-y-1.5">
      {TIPS.map((tip) => (
        <li key={tip.en} className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <tip.icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-foreground">{tip.ur}</span> <span className="opacity-70">— {tip.en}</span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default PhotoTips;
