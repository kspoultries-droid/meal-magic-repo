import { Camera, Lightbulb, Maximize, Sun, XCircle } from "lucide-react";

const TIPS = [
  { icon: Sun, ur: "دن کی روشنی یا کھڑکی کے سامنے تصویر لیں", en: "Use daylight" },
  { icon: XCircle, ur: "فلیش بند رکھیں — چمک پروڈکٹ خراب کر دیتی ہے", en: "Flash off" },
  { icon: Maximize, ur: "سادہ دیوار یا میز کے سامنے رکھیں، پیچھے سامان نہ ہو", en: "Plain background" },
  { icon: Camera, ur: "پروڈکٹ پورا فریم میں ہو اور موبائل مستحکم رکھیں", en: "Whole product, steady hand" },
  { icon: Lightbulb, ur: "ہمیشہ اپنی اصل پروڈکٹ کی تصویر لگائیں — انٹرنیٹ سے لی گئی تصویر ممنوع ہے", en: "Real product only" },
];

const PhotoTips = () => (
  <div className="rounded-xl border border-border/70 bg-accent/40 p-3">
    <p className="mb-2 text-xs font-extrabold text-foreground">اچھی تصویر کیسے لیں؟ / How to shoot</p>
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
