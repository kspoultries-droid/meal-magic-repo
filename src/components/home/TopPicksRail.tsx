import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Clock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Pick {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
}

const fallbackImg =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&fm=webp&q=75";

const TopPicksRail = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, image_url, rating, delivery_time, is_active")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(8);
      setPicks(
        (data || []).map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image_url || fallbackImg,
          rating: r.rating || 0,
          deliveryTime: r.delivery_time || "30-45 min",
        }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-3">
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-44 h-32 rounded-2xl bg-muted animate-pulse shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (picks.length === 0) return null;

  return (
    <section className="py-3">
      <div className="container mx-auto px-4 flex items-center gap-2 mb-3">
        <div className="w-7 h-7 shrink-0 rounded-lg bg-accent flex items-center justify-center">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-extrabold text-foreground">بہترین انتخاب</h2>
        <span className="min-w-0 text-[11px] text-muted-foreground">Top picks for you</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {picks.map((p, i) => (
          <Button variant="ghost"
            key={p.id}
            onClick={() => navigate(`/restaurant/${p.id}`)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-fade-in group relative block h-auto w-44 shrink-0 overflow-hidden whitespace-normal rounded-lg border border-border shadow-soft bg-card p-0 text-start active:scale-95 transition-transform hover:bg-card"
          >
            <div className="relative h-24 overflow-hidden">
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold text-primary-foreground bg-foreground/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Star className="w-3 h-3 fill-current text-warning" />
                {p.rating || "New"}
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                {p.deliveryTime}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </section>
  );
};

export default TopPicksRail;
