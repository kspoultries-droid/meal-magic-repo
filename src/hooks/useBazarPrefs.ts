import { useCallback, useEffect, useState } from "react";

const WISHLIST_KEY = "bazar_wishlist";
const RECENT_KEY = "bazar_recent";
const MAX_RECENT = 12;

const read = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

/** محفوظ (wishlist) اور حالیہ دیکھے گئے پروڈکٹس — localStorage میں */
export const useBazarPrefs = () => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(read(WISHLIST_KEY));
    setRecent(read(RECENT_KEY));
  }, []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      write(WISHLIST_KEY, next);
      return next;
    });
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    write(RECENT_KEY, []);
  }, []);

  return { wishlist, recent, toggleWishlist, pushRecent, clearRecent };
};

export default useBazarPrefs;
