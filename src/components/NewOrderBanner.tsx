import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewOrderBannerProps {
  count: number;
  onDismiss: () => void;
  label?: string;
}

const NewOrderBanner = ({ count, onDismiss, label = "نیا آرڈر آیا! / New Order!" }: NewOrderBannerProps) => {
  if (count === 0) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between gap-3 shadow-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5" />
        <div>
          <p className="font-extrabold text-sm">🔔 {label}</p>
          <p className="text-xs opacity-90">{count} نیا آرڈر / {count} new</p>
        </div>
      </div>
      <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={onDismiss}>
        <X className="w-3 h-3 mr-1" /> ٹھیک ہے
      </Button>
    </div>
  );
};

export default NewOrderBanner;
