import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

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
}

const BoughtTogether = ({ sourceId, source = "restaurant", sourceName = "" }: Props) => {
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
        setList((data || []).filter((d) => !inCart.has(d.id)).slice(0, 8).map((d) => ({ id: d.id, name: d.name, price: d.price, image: (d as any).image_url })));
      } else {
        const { data } = await supabase
          .from("grocery_products")
          .select("id, name, price, image_url")
          .eq("store_id", sourceId)
          .order("price", { ascending: true })
          .limit(12);
        setList((data || []).filter((d) => !inCart.has(d.id)).slice(0, 8).map((d) => ({ id: d.id, name: d.name, price: d.price, image: (d as any).image_url })));
      }
    };
    load();
  }, [sourceId, source, items]);

  if (!sourceId || list.length === 0) return null;

  return (
    <div className="glass animate-fade-in rounded-2xl border border-border/50 p-4 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        اکثر ساتھ خریدے جاتے ہیں
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {list.map((s) => (
          <div key={s.id} className="w-28 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            <div className="h-20 w-full bg-secondary">
              {s.image && <img src={s.image} alt={s.name} loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <div className="p-2">
              <p className="truncate text-[11px] font-bold text-foreground">{s.name}</p>
              <p className="text-[11px] font-extrabold text-primary">Rs {s.price}</p>
              <button
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
                  });
                  toast.success(`${s.name} شامل ہو گیا`);
                }}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-primary py-1 text-[10px] font-bold text-primary-foreground active:scale-95 transition-transform"
              >
                <Plus className="h-3 w-3" /> شامل کریں
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoughtTogether;
