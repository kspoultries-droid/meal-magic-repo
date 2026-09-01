import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  active?: boolean;
}

const AccountTile = ({ icon, label, value, onClick, active }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-w-0 flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-card ${active ? "border-primary bg-accent" : "border-border bg-card"}`}
  >
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block truncate text-xs font-extrabold text-foreground">{label}</span>
      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{value}</span>
    </span>
  </button>
);

export default AccountTile;
