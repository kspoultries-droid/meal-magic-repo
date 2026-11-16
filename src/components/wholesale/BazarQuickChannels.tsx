import { Heart, History, Percent, Star, Store, Truck, Zap, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type QuickChannel = { key: string; icon: LucideIcon; en: string; ur: string; active?: boolean; onClick: () => void };

export const CHANNEL_ICONS = { flash: Zap, discount: Percent, nationwide: Truck, top: Star, best: Flame, shops: Store, wishlist: Heart, recent: History };

const BazarQuickChannels = ({ channels, lang }: { channels: QuickChannel[]; lang: string }) => (
  <section className="w-full px-3 pt-3 sm:px-6" aria-label={lang === "ur" ? "فوری راستے" : "Quick channels"}>
    <div className="grid grid-cols-4 gap-2 rounded-2xl border bg-card p-3 shadow-soft sm:grid-cols-8">
      {channels.map(({ key, icon: Icon, en, ur, active, onClick }) => (
        <button key={key} type="button" onClick={onClick} aria-pressed={active} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center transition-transform active:scale-95">
          <span className={`grid size-12 place-items-center rounded-2xl ${active ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}><Icon className="size-5" /></span>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">{lang === "ur" ? ur : en}</span>
        </button>
      ))}
    </div>
  </section>
);
export default BazarQuickChannels;
