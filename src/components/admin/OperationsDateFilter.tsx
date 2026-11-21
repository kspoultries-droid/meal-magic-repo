import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { operationDates } from "@/lib/operationsList";

export default function OperationsDateFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return <div className="mb-3 flex flex-wrap items-end gap-2">
    <label className="min-w-0 text-xs text-muted-foreground">{tr("From date", "اس تاریخ سے")}<Input aria-label={tr("From date", "اس تاریخ سے")} type="date" className="mt-1 w-40 max-w-full" value={from} max={to || undefined} onChange={e => onChange(e.target.value, to)} /></label>
    <label className="min-w-0 text-xs text-muted-foreground">{tr("To date", "اس تاریخ تک")}<Input aria-label={tr("To date", "اس تاریخ تک")} type="date" className="mt-1 w-40 max-w-full" value={to} min={from || undefined} onChange={e => onChange(from, e.target.value)} /></label>
    {(from || to) && <Button size="icon" variant="outline" aria-label={tr("Clear dates", "تاریخیں صاف کریں")} onClick={() => onChange("", "")}><RotateCcw className="size-4" /></Button>}
    {operationDates(from, to).invalid && <p role="alert" className="w-full text-xs text-destructive">{tr("End date must not be before start date", "آخری تاریخ پہلی تاریخ سے پہلے نہیں ہو سکتی")}</p>}
  </div>;
}