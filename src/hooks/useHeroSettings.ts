import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroConfig, parseHeroConfig } from "@/lib/heroConfig";

export type HeroSettingsKey = "hero_bazar" | "hero_services";

export const useHeroSettings = (key: HeroSettingsKey, defaults: HeroConfig) => {
  const cacheKey = `easylife:${key}`;
  const readCache = () => { try { const raw = localStorage.getItem(cacheKey); return raw ? parseHeroConfig(raw, defaults) : null; } catch { return null; } };
  const [config, setConfig] = useState<HeroConfig>(() => readCache() ?? defaults);
  // With a cached copy the page shows instantly; only the very first visit waits.
  const [loaded, setLoaded] = useState(() => readCache() !== null);

  useEffect(() => {
    let active = true;
    setLoaded(readCache() !== null);
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
        if (!active) return;
        if (!error) {
          setConfig(parseHeroConfig(data?.value, defaults));
          try { if (data?.value != null) localStorage.setItem(cacheKey, typeof data.value === "string" ? data.value : JSON.stringify(data.value)); } catch { /* ignore */ }
        }
      } finally {
        if (active) setLoaded(true);
      }
    };
    void fetchSettings().catch(() => undefined);
    return () => { active = false; };
    // Defaults are stable module constants; reload when the settings key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useCallback(
    async (next: HeroConfig) => {
      const { error } = await supabase.from("app_settings").update({ value: JSON.stringify(next) }).eq("key", key);
      if (error) throw error;
      setConfig(next);
      try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* ignore */ }
    },
    [key],
  );

  return { config, loaded, save };
};
