import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSuccess: () => void;
}

const FeedbackDialog = ({ open, onOpenChange, booking, onSuccess }: FeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("ریٹنگ دیں");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("service_reviews").insert({
      booking_id: booking.id,
      service_id: booking.service_id,
      customer_id: booking.customer_id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("آپ پہلے ہی فیڈبیک دے چکے ہیں");
      } else {
        toast.error("فیڈبیک میں مسئلہ آیا");
        console.error(error);
      }
    } else {
      toast.success("فیڈبیک کا شکریہ! ⭐");
      setRating(0);
      setComment("");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">فیڈبیک دیں ⭐</DialogTitle>
          <DialogDescription>اپنے تجربے کی ریٹنگ اور رائے دیں</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-125"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? "ستارے پر ٹیپ کریں" : 
             rating <= 2 ? "😞 بہتری کی ضرورت" : 
             rating <= 3 ? "😐 ٹھیک ہے" : 
             rating <= 4 ? "😊 اچھا تجربہ" : "🤩 بہترین!"}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اپنی رائے لکھیں (اختیاری)..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none"
          />

          <Button
            className="w-full h-12 text-base font-extrabold rounded-xl"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? "بھیج رہے ہیں..." : "فیڈبیک بھیجیں"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
