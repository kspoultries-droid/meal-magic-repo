import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** restaurant id (food) or grocery store id (grocery/bazar) */
  restaurantId: string;
  customerId: string;
  kind?: "food" | "grocery";
  /** when present, the customer can also rate the rider */
  riderId?: string | null;
  items?: { name: string; quantity: number }[];
  onSubmitted?: () => void;
}

const StarRow = ({ value, onChange, size = "w-10 h-10" }: { value: number; onChange: (v: number) => void; size?: string }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-125"
        >
          <Star className={`${size} ${s <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
};

const OrderReviewDialog = ({ open, onOpenChange, orderId, restaurantId, customerId, kind = "food", riderId, items = [], onSubmitted }: Props) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [riderRating, setRiderRating] = useState(0);
  const [riderComment, setRiderComment] = useState("");
  const [existingRider, setExistingRider] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const table = kind === "grocery" ? "grocery_reviews" : "order_reviews";
  const orderKind = kind === "grocery" ? "grocery_cart" : "food";

  useEffect(() => {
    if (!open) return;
    supabase
      .from(table as any)
      .select("*")
      .eq("order_id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExisting(data);
          setRating(data.rating);
          setComment(data.comment || "");
        } else {
          setExisting(null); setRating(0); setComment("");
        }
      });
  }, [open, orderId, customerId, table]);

  useEffect(() => {
    if (!open || !riderId) { setExistingRider(null); setRiderRating(0); setRiderComment(""); return; }
    supabase
      .from("rider_reviews" as any)
      .select("*")
      .eq("order_id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) { setExistingRider(data); setRiderRating(data.rating); setRiderComment(data.comment || ""); }
        else { setExistingRider(null); setRiderRating(0); setRiderComment(""); }
      });
  }, [open, orderId, customerId, riderId]);

  const submit = async () => {
    if (rating === 0) { toast.error("پہلے ستارے دیں / Give a rating"); return; }
    setSubmitting(true);
    let error;
    if (existing) {
      ({ error } = await supabase.from(table as any).update({ rating, comment: comment.trim() || null }).eq("id", existing.id));
    } else {
      const payload: any = kind === "grocery"
        ? { order_id: orderId, store_id: restaurantId, customer_id: customerId, rating, comment: comment.trim() || null }
        : { order_id: orderId, restaurant_id: restaurantId, customer_id: customerId, rating, comment: comment.trim() || null };
      ({ error } = await supabase.from(table as any).insert(payload));
    }

    if (!error && riderId && riderRating > 0) {
      const riderPayload: any = {
        order_id: orderId,
        order_kind: orderKind,
        rider_id: riderId,
        customer_id: customerId,
        rating: riderRating,
        comment: riderComment.trim() || null,
      };
      const res = existingRider
        ? await supabase.from("rider_reviews" as any).update({ rating: riderRating, comment: riderComment.trim() || null }).eq("id", existingRider.id)
        : await supabase.from("rider_reviews" as any).insert(riderPayload);
      if (res.error) error = res.error;
    }

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("شکریہ! آپ کی رائے محفوظ ہو گئی ⭐");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">آرڈر کی رائے دیں ⭐</DialogTitle>
          <DialogDescription>
            {kind === "grocery" ? "اسٹور کے تجربے کی درجہ بندی کریں" : "ریسٹورنٹ کے تجربے کی درجہ بندی کریں"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {items.length > 0 && (
            <div className="rounded-xl bg-secondary/40 p-3 space-y-1">
              {items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="truncate">{i.name}</span>
                  <span className="font-bold shrink-0">×{i.quantity}</span>
                </div>
              ))}
            </div>
          )}

          <StarRow value={rating} onChange={setRating} />
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? "ستارے پر ٹیپ کریں" : rating <= 2 ? "😞 بہتری چاہیے" : rating <= 3 ? "😐 ٹھیک ہے" : rating <= 4 ? "😊 اچھا" : "🤩 بہترین!"}
          </p>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اپنی رائے لکھیں (اختیاری)..." rows={3} maxLength={500} className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none" />

          {riderId && (
            <div className="rounded-2xl border bg-secondary/20 p-3 space-y-2">
              <p className="text-sm font-extrabold flex items-center justify-center gap-2">
                <Bike className="w-4 h-4 text-primary" /> رائیڈر کو ریٹنگ دیں / Rate your rider
              </p>
              <StarRow value={riderRating} onChange={setRiderRating} size="w-8 h-8" />
              <textarea
                value={riderComment}
                onChange={(e) => setRiderComment(e.target.value)}
                placeholder="رائیڈر کے بارے میں (اختیاری)..."
                rows={2}
                maxLength={300}
                className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none"
              />
            </div>
          )}

          <Button className="w-full h-12 font-extrabold rounded-xl" onClick={submit} disabled={submitting || rating === 0}>
            {submitting ? "بھیجا جا رہا ہے..." : existing ? "اپڈیٹ کریں" : "رائے بھیجیں"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderReviewDialog;
