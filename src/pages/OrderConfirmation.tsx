import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Package, MapPin, Phone, Home, Receipt, ChevronRight, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LocationSheet from "@/components/location/LocationSheet";
import { useLanguage } from "@/contexts/LanguageContext";

const OrderConfirmation = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locOpen, setLocOpen] = useState(false);

  const isGrocery = type === "grocery";
  const trackingPath = `/order-tracking/${id}`;

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const table = isGrocery ? "grocery_cart_orders" : "orders";
      const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      setOrder(data);
      setLoading(false);
    };
    fetch();
  }, [id, isGrocery]);

  const shortId = id?.slice(0, 8).toUpperCase();

  const copyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success("آرڈر ID کاپی ہو گیا");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="relative overflow-hidden bg-gradient-hero px-4 py-5 text-primary-foreground">
        <div className="mx-auto flex max-w-md items-center gap-3 animate-scale-in">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 shadow-glow">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{t("conf.success")}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-md space-y-2.5 px-3 py-3">
        <div className="glass rounded-xl p-3 shadow-card animate-slide-up">
          <p className="mb-0.5 text-[10px] text-muted-foreground">{t("conf.orderNumber")}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-base font-extrabold text-primary">#{shortId}</span>
            <Button variant="ghost" size="sm" onClick={copyId} className="h-7 gap-1 px-2 text-[10px]"><Copy className="h-3 w-3" /> {t("conf.copy")}</Button>
          </div>
        </div>

        {/* Summary */}
        {order && (
          <div className="rounded-xl border bg-card p-3 shadow-card animate-slide-up">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold">
              <Receipt className="w-4 h-4 text-primary" /> {t("conf.summary")}
            </h2>

            {isGrocery && Array.isArray(order.items) && (
              <div className="mb-2 max-h-24 space-y-1 overflow-y-auto border-b pb-2">
                {order.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-foreground">{it.name} × {it.quantity}</span>
                    <span className="font-semibold">Rs {it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("common.total")}</span><span className="font-extrabold text-primary text-base">Rs {order.total_amount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("conf.payment")}</span><span className="font-semibold uppercase">{order.payment_method || "COD"}</span></div>
              <div className="flex items-start gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1 text-muted-foreground">{order.delivery_address || t("conf.noAddress")}</span>
                <button
                  onClick={() => setLocOpen(true)}
                  className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-primary active:scale-95 transition-transform"
                >
                  {t("checkout.change")}
                </button>
              </div>
              <LocationSheet
                open={locOpen}
                onOpenChange={setLocOpen}
                onSelected={async (loc) => {
                  const table = isGrocery ? "grocery_cart_orders" : "orders";
                  const { error } = await supabase.from(table).update({ delivery_address: loc.address }).eq("id", id || "");
                  if (error) return toast.error("پتہ تبدیل نہیں ہو سکا");
                  setOrder((o: any) => ({ ...o, delivery_address: loc.address }));
                  toast.success("ڈیلیوری کا پتہ اپڈیٹ ہو گیا");
                }}
              />
              {order.is_gift && order.receiver_name && (
                <div className="flex gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> <span>{order.receiver_name} — {order.receiver_phone}</span></div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs shadow-card animate-slide-up">
          <Package className="h-5 w-5 shrink-0 text-primary" />
          <p className="font-semibold">{isGrocery ? order?.status === "confirmed" ? "دکان نے آرڈر قبول کر لیا؛ پیک ہونے کے بعد روانگی ہوگی۔" : "آرڈر دکان کو مل گیا؛ اشیا کی دستیابی کی تصدیق کا انتظار ہے۔" : t("conf.nextStep")}</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => navigate("/")} className="h-11 rounded-xl">
            <Home className="w-4 h-4 mr-1" /> {t("common.home")}
          </Button>
          <Button onClick={() => navigate(trackingPath)} className="h-11 rounded-xl bg-gradient-primary shadow-glow">
            <Package className="w-4 h-4 mr-1" /> {isGrocery ? t("conf.myOrders") : t("conf.track")} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
