import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import LocationSheet from "./LocationSheet";
import { useDeliveryLocation } from "@/hooks/useDeliveryLocation";

const LocationBar = ({ className = "" }: { className?: string }) => {
  const { location } = useDeliveryLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 text-right shadow-soft active:scale-[0.99] transition-transform ${className}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold text-muted-foreground">ڈیلیوری یہاں</span>
          <span className="block truncate text-xs font-extrabold text-foreground">
            {location?.address || "لوکیشن شامل کریں"}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-primary">
          {location ? "تبدیل کریں" : "شامل کریں"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default LocationBar;
