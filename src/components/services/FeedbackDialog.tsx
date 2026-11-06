import { tr } from "@/lib/i18n/tr";
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
      toast.error(tr("Please give a rating", "Please give a rating / ریٹنگ دیں"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_service_review", {
      _booking_id: booking.id,
      _rating: rating,
      _comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error(tr("Already reviewed", "Already reviewed / آپ پہلے ہی فیڈبیک دے چکے ہیں"));
      } else {
        toast.error(tr("Feedback failed", "Feedback failed / فیڈبیک میں مسئلہ آیا"));
        console.error(error);
      }
    } else {
      toast.success(tr("Thanks for feedback! ⭐", "Thanks for feedback! / فیڈبیک کا شکریہ! ⭐"));
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
          <DialogTitle className="text-lg font-extrabold">{tr("Give feedback ⭐", "Give Feedback / فیڈبیک دیں ⭐")}</DialogTitle>
          <DialogDescription>{tr("Rate your experience", "Rate your experience / اپنے تجربے کی ریٹنگ دیں")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button variant="ghost" size="icon" aria-label={`${star} / 5`}
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-125"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoverRating || rating)
                      ? "fill-warning text-warning"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? tr("Tap a star", "Tap a star / ستارے پر ٹیپ کریں") : 
             rating <= 2 ? tr("😞 Needs improvement", "😞 Needs improvement / بہتری کی ضرورت") : 
             rating <= 3 ? tr("😐 Okay", "😐 Okay / ٹھیک ہے") : 
             rating <= 4 ? tr("😊 Good experience", "😊 Good experience / اچھا تجربہ") : tr("🤩 Excellent!", "🤩 Excellent! / بہترین!")}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={tr("Write your review (optional)...", "Write your review (optional) / اپنی رائے لکھیں (اختیاری)...")}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm resize-none"
          />

          <Button
            className="w-full h-12 text-base font-extrabold rounded-xl"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? tr("Submitting...", "Submitting... / بھیج رہے ہیں...") : tr("Submit Feedback", "Submit Feedback / فیڈبیک بھیجیں")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
