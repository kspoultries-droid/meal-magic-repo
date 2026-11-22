import { useEffect, useState } from "react";
import { Plus, Sparkles, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";

interface Suggestion {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

interface Props {
  sourceId?: string;
  source?: "restaurant" | "grocery";
  sourceName?: string;
  bazar?: boolean;
}

const BoughtTogether = ({ sourceId, source = "restaurant", sourceName = "", bazar }: Props) => {
  const { items, addItem } = useCart();
  const [list, setList] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!sourceId) return;
    const load = async () => {
      const inCart = new Set(items.map((i) => i.menu_item_id));
      if (source === "restaurant") {
        const { data } = await supabase
          .from("menu_items")
          .select("id, name, price, image_url")
          .eq("restaurant_id", sourceId)
          .eq("is_available", true)
          .order("price", { ascending: true })
          .limit(12);
        setList((data || []).filter((d) => !inCart.has(d.id)).slice(0, 8).map((d: any) => ({ id: d.id, name: d.name, price: d.discount_price && d.discount_price < d.price ? d.discount_price : d.price, image: d.image_url })));
      } else {
        const { data } = await supabase
          .from("grocery_products")
          .select("id, name, price, discount_price, image_url")
          .eq("store_id", sourceId)
          .order("price", { ascending: true })
          .limit(12);
        setList((data || []).filter((d) => !inCart.has(d.id)).slice(0, 8).map((d: any) => ({ id: d.id, name: d.name, price: d.discount_price && d.discount_price < d.price ? d.discount_price : d.price, image: d.image_url })));
      }
    };
    load();
  }, [sourceId, source, items]);

  if (!sourceId || list.length === 0) return null;

  return (
    <section className="border-y border-border py-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        {tr("Add to your order", "آرڈر میں مزید شامل کریں")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {list.map((s) => (
          <div key={s.id} className="w-28 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card shadow-soft">
            <div className="h-20 w-full bg-secondary">
              {s.image ? <img src={s.image} alt={s.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="size-6" /></div>}
            </div>
            <div className="p-2">
              <p dir="auto" className="line-clamp-2 break-words text-[11px] font-bold text-foreground">{s.name}</p>
              <p className="text-[11px] font-extrabold text-primary">Rs {s.price}</p>
              <Button variant="default" size="sm"
                onClick={() => {
                  addItem({
                    id: s.id,
                    menu_item_id: s.id,
                    name: s.name,
                    restaurant: sourceName,
                    price: s.price,
                    image: s.image || "",
                    source,
                    sourceId,
                    bazar,
                  });
                }}
                className="mt-1.5 h-8 w-full gap-1 px-1 text-[10px] font-bold"
              >
                <Plus className="h-3 w-3" /> {tr("Add", "شامل کریں")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BoughtTogether;
