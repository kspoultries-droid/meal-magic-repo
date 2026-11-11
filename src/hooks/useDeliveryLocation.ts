import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { readDeliveryLocation, writeDeliveryLocation, LOCATION_EVENT, type DeliveryLocation } from "@/lib/deliveryLocationStorage";
export type { DeliveryLocation } from "@/lib/deliveryLocationStorage";
export const setStoredLocation = writeDeliveryLocation;

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
  const [location, setLocation] = useState<DeliveryLocation | null>(() => readDeliveryLocation(user?.id));
  const [saved, setSaved] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setLocation(readDeliveryLocation(user?.id));
    sync();
    window.addEventListener(LOCATION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCATION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user?.id]);

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
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.id !== user.id) return;
    const list = (data || []).map((a: any) => ({
      id: a.id,
      label: a.label || "پتہ",
      address: a.address,
      lat: a.lat,
      lng: a.lng,
    }));
    setSaved(list);
    if (!readDeliveryLocation(user.id) && list[0]) setStoredLocation(list[0], user.id);
  }, [user]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const select = useCallback((loc: DeliveryLocation) => setStoredLocation(loc, user?.id), [user?.id]);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) return null;
    setLoading(true);
    return new Promise<DeliveryLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const address = await reverseGeocode(latitude, longitude);
          const loc: DeliveryLocation = { label: "موجودہ لوکیشن", address, lat: latitude, lng: longitude, source: "gps" };
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
      } else {
        // Guest-typed addresses are browsing-only: keep them visible while signed
        // out, but never carry them into an account or another visitor.
        loc = { ...loc, source: "guest_address" };
      }
      setStoredLocation(loc, user?.id);
      return loc;
    },
    [user, saved.length, loadSaved],
  );

  const visibleLocation = location?.ownerId && location.ownerId !== user?.id ? null : location;
  return { location: visibleLocation, saved: user ? saved : [], loading, select, detect, saveNew, refresh: loadSaved };
};
