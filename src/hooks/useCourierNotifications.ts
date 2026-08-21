import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SHIPMENT_MESSAGES as MESSAGES } from "@/lib/courier";



/** Live courier/shipment updates for the signed-in customer. */
export const useCourierNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`courier-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "grocery_cart_orders",
          filter: `customer_id=eq.${user.id}`,
        },
        (payload: any) => {
          const next = payload.new || {};
          const prev = payload.old || {};
          if (next.shipment_status && next.shipment_status !== prev.shipment_status) {
            toast.info(MESSAGES[next.shipment_status] || "شپمنٹ اپڈیٹ ہوئی 📦", {
              id: `ship-${next.id}-${next.shipment_status}`,
              description: next.courier_name
                ? `${next.courier_name}${next.tracking_number ? ` · ${next.tracking_number}` : ""}`
                : undefined,
            });
          } else if (next.tracking_number && next.tracking_number !== prev.tracking_number) {
            toast.info("ٹریکنگ نمبر مل گیا 📦", {
              id: `track-${next.id}`,
              description: `${next.courier_name || "کورئیر"} · ${next.tracking_number}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};

export default useCourierNotifications;
