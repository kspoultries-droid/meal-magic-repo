import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocateFixed, MapPin, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useDeliveryLocation, type DeliveryLocation } from "@/hooks/useDeliveryLocation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelected?: (loc: DeliveryLocation) => void;
}

const LocationSheet = ({ open, onOpenChange, onSelected }: Props) => {
  const { location, saved, loading, select, detect, saveNew, refresh } = useDeliveryLocation();
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const pick = (loc: DeliveryLocation) => {
    select(loc);
    onSelected?.(loc);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-right">
          <SheetTitle className="flex items-center justify-end gap-2 text-base font-extrabold">
            ڈیلیوری کا پتہ <MapPin className="h-4 w-4 text-primary" />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full justify-start gap-2 rounded-2xl border-primary/40 font-bold text-primary"
            disabled={loading}
            onClick={async () => {
              const loc = await detect();
              if (!loc) return toast.error("لوکیشن نہیں مل سکی — براؤزر میں اجازت دیں");
              toast.success("لوکیشن سیٹ ہو گئی 📍");
              onSelected?.(loc);
              onOpenChange(false);
            }}
          >
            <LocateFixed className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            موجودہ لوکیشن استعمال کریں
          </Button>

          {saved.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">محفوظ شدہ پتے</p>
              {saved.map((a) => {
                const active = location?.address === a.address;
                return (
                  <button
                    key={a.id || a.address}
                    onClick={() => pick(a)}
                    className={`flex w-full items-start gap-2 rounded-2xl border p-3 text-right transition-all ${
                      active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-foreground">{a.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{a.address}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-dashed p-3">
            <p className="text-xs font-bold text-muted-foreground">نیا پتہ لکھیں</p>
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="مکمل پتہ — محلہ، گلی، شہر"
              className="h-11 rounded-xl"
            />
            <Button
              className="h-11 w-full rounded-xl bg-gradient-primary font-bold"
              disabled={!manual.trim() || saving}
              onClick={async () => {
                setSaving(true);
                const loc = await saveNew({ label: "میرا پتہ", address: manual.trim() });
                setSaving(false);
                setManual("");
                toast.success("پتہ محفوظ ہو گیا");
                onSelected?.(loc);
                onOpenChange(false);
              }}
            >
              <Plus className="me-1 h-4 w-4" /> محفوظ کر کے استعمال کریں
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LocationSheet;
