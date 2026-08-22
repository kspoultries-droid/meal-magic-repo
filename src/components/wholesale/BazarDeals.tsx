import { useEffect, useState } from "react";
import { Copy, Check, Ticket, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Voucher {
  id: string;
  code: string;
  title: string;
  title_ur: string | null;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  scope: string;
  valid_until: string | null;
}

const gradients = [
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-cyan-500",
];

const BazarDeals = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (supabase.from("vouchers" as any).select("*").eq("is_active", true).order("sort_order") as any)
      .then(({ data }: any) => {
        const all: Voucher[] = data || [];
        setVouchers(all.filter((v) => v.scope === "wholesale" || v.scope === "all"));
        setLoaded(true);
      });
  }, []);

  const copyCode = async (v: Voucher) => {
    try {
      await navigator.clipboard.writeText(v.code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = v.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(v.id);
    toast.success(`کوڈ "${v.code}" کاپی ہو گیا — چیک آؤٹ پر لگائیں 🎟️`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loaded && vouchers.length === 0) return null;
  if (!loaded) return null;

  const daysLeft = (until: string | null) => {
    if (!until) return null;
    const d = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000);
    return d > 0 ? d : null;
  };

  return (
    <section className="py-3">
      <div className="container mx-auto px-4 flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
          <Ticket className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="text-base font-extrabold text-foreground">واؤچرز اور ڈیلز</h2>
        <span className="text-[11px] text-muted-foreground">Vouchers & Deals</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {vouchers.map((v, i) => {
          const left = daysLeft(v.valid_until);
          return (
            <div
              key={v.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`animate-fade-in relative shrink-0 w-64 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} p-4 text-primary-foreground shadow-card overflow-hidden`}
            >
              {/* ticket notches */}
              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background" />
              <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background" />
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary-foreground/15 blur-2xl" />

              <p className="text-xl font-extrabold leading-tight">
                {v.discount_type === "percent" ? `${v.discount_value}% رعایت` : `Rs ${v.discount_value} رعایت`}
              </p>
              <p className="text-xs font-bold opacity-95 truncate">{v.title_ur || v.title}</p>
              {v.min_order > 0 && (
                <p className="text-[10px] opacity-80 mt-0.5">کم از کم آرڈر: Rs {v.min_order}</p>
              )}

              <button
                onClick={() => copyCode(v)}
                className="mt-2.5 flex items-center justify-between w-full rounded-lg border border-dashed border-primary-foreground/50 bg-primary-foreground/15 backdrop-blur-sm px-3 py-1.5 active:scale-95 transition-transform"
              >
                <span className="font-mono font-extrabold tracking-widest text-sm">{v.code}</span>
                {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-80" />}
              </button>

              {left !== null && (
                <p className="flex items-center gap-1 text-[9px] font-semibold opacity-80 mt-1.5">
                  <Clock className="w-2.5 h-2.5" /> {left} دن باقی
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default BazarDeals;
