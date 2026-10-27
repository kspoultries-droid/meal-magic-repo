import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroConfig, parseHeroConfig } from "@/lib/heroConfig";

export type HeroSettingsKey = "hero_bazar" | "hero_services";

export const useHeroSettings = (key: HeroSettingsKey, defaults: HeroConfig) => {
  const [config, setConfig] = useState<HeroConfig>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
        if (!active) return;
        if (!error) setConfig(parseHeroConfig(data?.value, defaults));
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
    },
    [key],
  );

  return { config, loaded, save };
};
