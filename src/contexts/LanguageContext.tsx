import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, LANGUAGES, LangCode, TranslationKey, translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "app:lang";

type LanguageContextValue = {
  lang: LangCode;
  dir: "rtl" | "ltr";
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const readStored = (): LangCode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANG;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<LangCode>(readStored);

  const dir = useMemo(() => LANGUAGES.find((l) => l.code === lang)?.dir ?? "rtl", [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string) => {
      const entry = translations[key];
      if (!entry) return fallback ?? String(key);
      return entry[lang] || entry[DEFAULT_LANG] || fallback || String(key);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so a component outside the provider never crashes the page.
    return {
      lang: DEFAULT_LANG,
      dir: "rtl",
      setLang: () => {},
      t: (key, fallback) => translations[key]?.[DEFAULT_LANG] ?? fallback ?? String(key),
    };
  }
  return ctx;
};
