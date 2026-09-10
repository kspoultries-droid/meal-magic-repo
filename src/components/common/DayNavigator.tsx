import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
};

const label = (d: Date) => {
  return d.toLocaleDateString("ur-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

interface Props {
  date: Date;
  onChange: (d: Date) => void;
  className?: string;
}

/** ایک دن پیچھے / آگے — کیلنڈر کے ساتھ */
const DayNavigator = ({ date, onChange, className }: Props) => {
  const isToday = dayKey(date) === dayKey(new Date());
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full border bg-card/70 backdrop-blur px-1.5 py-1", className)}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full"
        aria-label="پچھلا دن"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs font-bold">
            <CalendarDays className="h-3.5 w-3.5" />
            {label(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover" align="center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onChange(startOfDay(d))}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full"
        aria-label="اگلا دن"
        disabled={isToday}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DayNavigator;
