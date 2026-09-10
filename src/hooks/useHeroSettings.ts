import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroConfig, parseHeroConfig } from "@/lib/heroConfig";

export type HeroSettingsKey = "hero_bazar" | "hero_services";

export const useHeroSettings = (key: HeroSettingsKey, defaults: HeroConfig) => {
  const [config, setConfig] = useState<HeroConfig>(defaults);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
    setConfig(parseHeroConfig(data?.value, defaults));
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

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
