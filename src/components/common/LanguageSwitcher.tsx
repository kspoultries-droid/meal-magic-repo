import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  /** "light" for dark/gradient headers, "default" for normal surfaces */
  tone?: "light" | "default";
  className?: string;
  showLabel?: boolean;
};

const LanguageSwitcher = ({ tone = "default", className = "", showLabel = false }: Props) => {
  const { lang, setLang, t } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  const toneClass =
    tone === "light"
      ? "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
      : "bg-muted text-foreground hover:bg-muted/70";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost"
          type="button"
          aria-label={t("common.language")}
          className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${toneClass} ${tone === "light" ? "hover:text-primary-foreground" : ""} ${className}`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{showLabel ? current.native : current.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-44 bg-popover">
        <DropdownMenuLabel className="text-xs">{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{l.flag}</span>
              <span>{l.native}</span>
            </span>
            {l.code === lang && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
