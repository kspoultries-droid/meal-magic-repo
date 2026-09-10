import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  label: string;
  value: number;
  secondary?: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
  valueLabel?: string;
  secondaryLabel?: string;
  prefix?: string;
}

const TrendChart = ({ data, height = 160, valueLabel = "سیل", secondaryLabel, prefix = "Rs " }: Props) => {
  if (!data.length) {
    return <p className="py-6 text-center text-xs text-muted-foreground">ابھی کوئی ڈیٹا نہیں</p>;
  }
  return (
    <div style={{ height }} className="w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendMain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="trendAlt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(v: number, n) => [`${prefix}${Math.round(Number(v))}`, n === "value" ? valueLabel : secondaryLabel || ""]}
          />
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#trendMain)" />
          {secondaryLabel && (
            <Area type="monotone" dataKey="secondary" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="url(#trendAlt)" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
