import { useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/** Only a drag starting at the thumb, or explicit keyboard confirmation, can submit. */
export default function SwipeConfirm({ label, disabled = false, onConfirm }: { label: string; disabled?: boolean; onConfirm: () => void | Promise<void> }) {
  const [value, setValue] = useState(0);
  const [pending, setPending] = useState(false);
  const armed = useRef(false);
  const submitting = useRef(false);
  const confirm = async (position = value) => {
    if (disabled || submitting.current || position < 95) return;
    submitting.current = true;
    setPending(true);
    try { await onConfirm(); }
    finally { setValue(0); armed.current = false; submitting.current = false; setPending(false); }
  };
  return <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
    <div className="flex items-center justify-between gap-2 text-xs font-bold"><span>{label}</span>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</div>
    <div className="flex h-11 items-center gap-3" dir="ltr">
      <Slider aria-label={label} min={0} max={100} step={1} value={[value]} disabled={disabled || pending}
        className="mx-4 [&_[role=slider]]:h-10 [&_[role=slider]]:w-10"
        onPointerDownCapture={event => { armed.current = value === 0 && event.target instanceof Element && !!event.target.closest('[role="slider"]'); }}
        onPointerCancel={() => { armed.current = false; setValue(0); }}
        onValueChange={values => setValue(values[0] ?? 0)}
        onValueCommit={values => { if (armed.current && (values[0] ?? 0) >= 95) void confirm(values[0] ?? 0); else if (armed.current) setValue(0); armed.current = false; }}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirm(); } }} />
      <Button variant="outline" size="icon" aria-label={label} title={label} disabled={disabled || pending || value < 95} onClick={() => void confirm()}><Check className="h-4 w-4" /></Button>
    </div>
  </div>;
}