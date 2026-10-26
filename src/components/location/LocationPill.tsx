import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import LocationSheet from "./LocationSheet";
import { useDeliveryLocation } from "@/hooks/useDeliveryLocation";
import { Button } from "@/components/ui/button";

const LocationPill = ({ className = "" }: { className?: string }) => {
  const { location } = useDeliveryLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost"
        onClick={() => setOpen(true)}
        className={`flex h-10 min-w-0 max-w-[52vw] items-center gap-1.5 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-1.5 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground sm:max-w-[280px] ${className}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-foreground" />
        <span className="truncate text-[11px] font-bold text-primary-foreground">
          {location?.address || "لوکیشن شامل کریں"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-primary-foreground/80" />
      </Button>
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default LocationPill;
