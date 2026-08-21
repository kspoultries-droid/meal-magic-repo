import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CityService {
  id: string;
  name: string;
  delivery_fee: number | null;
  food_enabled: boolean;
  grocery_enabled: boolean;
  wholesale_enabled: boolean;
  rider_count: number;
  food_live: boolean;
  grocery_live: boolean;
  wholesale_live: boolean;
  default_courier: string | null;
  courier_payment_default: string | null;
  courier_advance_percent: number | null;
}

const CITY_KEY = "easylife:city_id";

export const getStoredCityId = () => {
  try {
    return localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
};

export const useCityServices = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState<CityService[]>([]);
  const [cityId, setCityIdState] = useState<string | null>(getStoredCityId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (supabase.rpc as any)("get_city_services").then(({ data }: any) => {
      if (cancelled) return;
      setCities((data || []) as CityService[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer the user's saved profile city when nothing is picked locally
  useEffect(() => {
    if (!user || cityId) return;
    supabase
      .from("profiles")
      .select("city_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.city_id) setCityIdState(data.city_id);
      });
  }, [user, cityId]);

  const setCityId = (id: string | null) => {
    setCityIdState(id);
    try {
      if (id) localStorage.setItem(CITY_KEY, id);
      else localStorage.removeItem(CITY_KEY);
    } catch {
      /* ignore */
    }
  };

  const city = cities.find((c) => c.id === cityId) || null;

  // No city chosen yet → do not block anything.
  return {
    cities,
    city,
    cityId,
    setCityId,
    loading,
    foodLive: city ? city.food_live : true,
    groceryLive: city ? city.grocery_live : true,
    wholesaleLive: city ? city.wholesale_live : true,
  };
};
