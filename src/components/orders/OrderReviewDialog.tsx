import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  restaurantId: string;
  customerId: string;
  onSubmitted?: () => void;
}

const OrderReviewDialog = ({ open, onOpenChange, orderId, restaurantId, customerId, onSubmitted }: Props) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("order_reviews")
      .select("*")
      .eq("order_id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setRating(data.rating);
          setComment(data.comment || "");
        } else {
          setExisting(null); setRating(0); setComment("");
        }
      });
  }, [open, orderId, customerId]);

  const submit = async () => {
    if (rating === 0) { toast.error("پہلے ستارے دیں / Give a rating"); return; }
    setSubmitting(true);
    let error;
    if (existing) {
      ({ error } = await supabase.from("order_reviews").update({ rating, comment: comment.trim() || null }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("order_reviews").insert({
        order_id: orderId, restaurant_id: restaurantId, customer_id: customerId,
        rating, comment: comment.trim() || null,
      }));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("شکریہ! آپ کی رائے محفوظ ہو گئی ⭐");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">آرڈر کی رائے دیں ⭐</DialogTitle>
          <DialogDescription>ریسٹورنٹ کے تجربے کی درجہ بندی کریں</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map((s) => (
              <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} className="transition-transform hover:scale-125">
                <Star className={`w-10 h-10 ${s <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? "ستارے پر ٹیپ کریں" : rating <= 2 ? "😞 بہتری چاہیے" : rating <= 3 ? "😐 ٹھیک ہے" : rating <= 4 ? "😊 اچھا" : "🤩 بہترین!"}
          </p>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اپنی رائے لکھیں (اختیاری)..." rows={3} maxLength={500} className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none" />
          <Button className="w-full h-12 font-extrabold rounded-xl" onClick={submit} disabled={submitting || rating === 0}>
            {submitting ? "بھیجا جا رہا ہے..." : existing ? "اپڈیٹ کریں" : "رائے بھیجیں"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderReviewDialog;
