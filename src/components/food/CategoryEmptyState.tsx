import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { foodCategories } from "@/lib/foodCategories";
import { tr } from "@/lib/i18n/tr";

// Typical dishes per category, shown so customers know what to expect.
const examples: Record<string, [string, string][]> = {
  coffee: [["Cappuccino", "کیپوچینو"], ["Café Latte", "کیفے لاٹے"], ["Espresso", "ایسپریسو"], ["Cold Coffee", "کولڈ کافی"], ["Doodh Patti Chai", "دودھ پتی چائے"], ["Hot Chocolate", "ہاٹ چاکلیٹ"]],
  juice: [["Fresh Orange Juice", "تازہ مالٹے کا جوس"], ["Mango Shake", "مینگو شیک"], ["Banana Shake", "بنانا شیک"], ["Sweet Lassi", "میٹھی لسی"], ["Mint Margarita", "منٹ مارگریٹا"], ["Fresh Lime", "فریش لائم"]],
  desserts: [["Gulab Jamun", "گلاب جامن"], ["Kheer", "کھیر"], ["Gajar Halwa", "گاجر کا حلوہ"], ["Chocolate Cake", "چاکلیٹ کیک"], ["Ice Cream", "آئس کریم"]],
  healthy: [["Garden Salad", "گارڈن سلاد"], ["Grilled Chicken", "گرلڈ چکن"], ["Fruit Chaat", "فروٹ چاٹ"], ["Soup", "سوپ"]],
};

export default function CategoryEmptyState({ category }: { category: string }) {
  const navigate = useNavigate();
  const cat = foodCategories.find((c) => c.name === category);
  const list = examples[cat?.slug || ""] || [];
  const label = cat ? tr(cat.name, cat.ur) : category;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-gradient-to-br from-primary/15 via-accent/40 to-background px-5 py-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-extrabold text-foreground">{tr(`${label} is coming soon`, `${label} جلد آرہی ہے`)}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {tr("Our partner restaurants are adding these items. Check back soon!", "ہمارے پارٹنر ریسٹورنٹس یہ آئٹمز شامل کر رہے ہیں۔ جلد دوبارہ دیکھیں!")}
        </p>
      </div>
      {list.length > 0 && (
        <div className="px-5 py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{tr(`What you'll find in ${label}`, `${label} میں کیا ملے گا`)}</p>
          <div className="flex flex-wrap gap-2">
            {list.map(([en, ur]) => (
              <span key={en} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground">{tr(en, ur)}</span>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-border px-5 py-4 text-center">
        <Button onClick={() => navigate("/")} className="rounded-full px-6">{tr("Explore all restaurants", "تمام ریسٹورنٹس دیکھیں")}</Button>
      </div>
    </div>
  );
}
