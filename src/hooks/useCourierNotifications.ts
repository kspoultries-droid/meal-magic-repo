import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  pending: "آپ کی شپمنٹ تیار کی جا رہی ہے 📦",
  dispatched: "آپ کا پارسل کورئیر کو دے دیا گیا ہے 🚚",
  in_transit: "آپ کا پارسل راستے میں ہے 🛣️",
  out_for_delivery: "آپ کا پارسل آج ڈلیوری کے لیے نکل چکا ہے 🏃",
  delivered: "آپ کا آرڈر ڈلیور ہو گیا ✅",
  returned: "آپ کا پارسل واپس ہو گیا ❌",
};

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
