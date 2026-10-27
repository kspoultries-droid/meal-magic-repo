import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromotionalAds from "@/components/PromotionalAds";
import HeroEditor from "@/components/common/HeroEditor";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import { bazarHeroDefaults, heroBackgroundStyle } from "@/lib/heroConfig";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hideAds?: boolean;
}

const BazarHero = ({ searchQuery, onSearchChange, hideAds }: Props) => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const { config, save } = useHeroSettings("hero_bazar", bazarHeroDefaults);

  return (
    <header className="relative isolate overflow-hidden border-b border-border">
      <div style={heroBackgroundStyle(config)} className="relative z-10">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold opacity-75">
              <MapPin className="size-3.5 shrink-0" style={{ color: config.accentColor }} />
              <span>{t("bazar.heroLocation")}</span>
            </div>
            {isAdmin && <HeroEditor config={config} defaults={bazarHeroDefaults} onSave={save} />}
          </div>
          <div className="mt-3 min-w-0" style={{ textAlign: config.align }}>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold" style={{ color: config.accentColor, justifyContent: config.align === "center" ? "center" : config.align === "left" ? "flex-start" : "flex-end" }}>
              <Sparkles className="size-3.5 shrink-0" /> {config.eyebrow}
            </p>
            <h1 className="font-display font-bold leading-tight" style={{ fontSize: config.titleSize }}>{config.title}</h1>
            <p className="mt-1 text-xs opacity-70 sm:text-sm">{config.subtitle}</p>
          </div>
          <label className="mt-4 flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 shadow-elegant focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={config.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="button" size="sm" className="hidden shrink-0 sm:inline-flex">{t("bazar.search")} <ArrowRight className="size-3.5" /></Button>
          </label>
        </div>
      </div>
      {!hideAds && <PromotionalAds placement="bazar" className="relative z-10 mx-auto w-full max-w-7xl px-3 py-3 sm:px-6" />}
      {!hideAds && config.showBadges && (
        <div className="relative z-10 flex min-h-9 items-center justify-center gap-4 border-t border-border/70 bg-card/80 px-3 py-2 text-[10px] font-semibold text-muted-foreground sm:gap-10">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 shrink-0 text-primary" /> {config.badge1}</span>
          <span className="flex items-center gap-1.5"><Truck className="size-3.5 shrink-0 text-primary" /> {config.badge2}</span>
          <span className="hidden items-center gap-1.5 sm:flex"><Sparkles className="size-3.5 shrink-0 text-primary" /> {config.badge3}</span>
        </div>
      )}
    </header>
  );
};

export default BazarHero;
