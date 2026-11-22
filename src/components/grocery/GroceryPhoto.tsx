import { useState } from "react";
import { img } from "@/lib/imageUrl";
import { tr } from "@/lib/i18n/tr";
import general from "@/assets/grocery/cat-all.jpg";
import meat from "@/assets/meat/mutton.jpg";
import vegetables from "@/assets/grocery/vegetables.jpg";
import fruits from "@/assets/grocery/fruits.jpg";
import dairy from "@/assets/grocery/milk.jpg";
import rice from "@/assets/grocery/atta-rice.jpg";
import cake from "@/assets/grocery/cat-cake.jpg";
import flowers from "@/assets/grocery/cat-flowers.jpg";
import gifts from "@/assets/grocery/cat-gifts.jpg";

const representatives: Record<string, string> = {
  Meat: meat, "Eggs & Meat": meat, Vegetables: vegetables, Fruits: fruits, Dairy: dairy,
  Atta: rice, "Atta & Rice": rice, Cake: cake, Bakery: cake, Flowers: flowers, Gift: gifts, Gifts: gifts,
};

/** A visibly labelled category illustration, never persisted as the vendor's actual photo. */
export default function GroceryPhoto({ url, name, category, cover = false }: { url?: string | null; name: string; category?: string | null; cover?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const original = Boolean(url && url !== failedUrl);
  return <div className="relative size-full overflow-hidden bg-card">
    <img src={original && url ? img(url, 360) : representatives[category || ""] || general}
      alt={original ? name : tr("Category photo", "زمرے کی تصویر")}
      onError={() => { if (original && url) setFailedUrl(url); }} loading="lazy"
      className={`size-full ${original && !cover ? "object-contain p-1.5" : "object-cover"}`} />
    {!original && <span className="absolute bottom-0 inset-x-0 bg-card/95 px-1 py-0.5 text-center text-[9px] leading-3 text-muted-foreground">{tr("Category photo", "زمرے کی تصویر")}</span>}
  </div>;
}