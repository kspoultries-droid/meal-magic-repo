import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DeliveryLocation {
  id?: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}

const STORAGE_KEY = "easylife:delivery-location";
const EVENT = "easylife:delivery-location-changed";

const readStored = (): DeliveryLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeliveryLocation) : null;
  } catch {
    return null;
  }
};

export const setStoredLocation = (loc: DeliveryLocation | null) => {
  try {
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ur`,
    );
    const data = await res.json();
    return (data?.display_name as string) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

export const useDeliveryLocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<DeliveryLocation | null>(readStored);
  const [saved, setSaved] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setLocation(readStored());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const loadSaved = useCallback(async () => {
    if (!user) {
      setSaved([]);
      return;
    }
    const { data } = await supabase
      .from("user_addresses")
      .select("id, label, address, lat, lng, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(8);
    const list = (data || []).map((a: any) => ({
      id: a.id,
      label: a.label || "پتہ",
      address: a.address,
      lat: a.lat,
      lng: a.lng,
    }));
    setSaved(list);
    if (!readStored() && list[0]) setStoredLocation(list[0]);
  }, [user]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const select = useCallback((loc: DeliveryLocation) => setStoredLocation(loc), []);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) return null;
    setLoading(true);
    return new Promise<DeliveryLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const address = await reverseGeocode(latitude, longitude);
          const loc: DeliveryLocation = { label: "موجودہ لوکیشن", address, lat: latitude, lng: longitude };
          setStoredLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        () => {
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  const saveNew = useCallback(
    async (loc: DeliveryLocation) => {
      if (user) {
        const { data } = await supabase
          .from("user_addresses")
          .insert({
            user_id: user.id,
            label: loc.label || "میرا پتہ",
            address: loc.address,
            lat: loc.lat ?? null,
            lng: loc.lng ?? null,
            is_default: saved.length === 0,
          })
          .select("id")
          .maybeSingle();
        if (data?.id) loc = { ...loc, id: data.id };
        await loadSaved();
      }
      setStoredLocation(loc);
      return loc;
    },
    [user, saved.length, loadSaved],
  );

  return { location, saved, loading, select, detect, saveNew, refresh: loadSaved };
};
