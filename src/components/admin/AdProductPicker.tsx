import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface Props {
  onPick: (p: { id: string; name: string; price: number | null; image: string | null; store: string }) => void;
}

/** Search a grocery/Bazar product so an ad click opens that product page (add to cart / buy). */
const AdProductPicker = ({ onPick }: Props) => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("grocery_products")
        .select("id,name,price,image_url,grocery_stores(name)")
        .ilike("name", `%${term}%`)
        .limit(8);
      setRows(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="rounded-lg border border-border p-2">
      <p className="mb-1 text-xs font-medium text-foreground">دکان کی پروڈکٹ سے جوڑیں (دبانے پر وہی چیز کھلے گی)</p>
      <Input placeholder="پروڈکٹ کا نام لکھیں..." value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto">
          {rows.map((r) => (
            <button key={r.id} type="button" className="flex w-full items-center gap-2 rounded p-1.5 text-start text-xs hover:bg-muted"
              onClick={() => { onPick({ id: r.id, name: r.name, price: r.price, image: r.image_url, store: r.grocery_stores?.name || "" }); setQ(""); setRows([]); }}>
              {r.image_url && <img src={r.image_url} alt="" className="size-8 rounded object-cover" />}
              <span className="flex-1 truncate">{r.name} <span className="text-muted-foreground">— {r.grocery_stores?.name}</span></span>
              <span className="font-bold">Rs {r.price}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdProductPicker;
