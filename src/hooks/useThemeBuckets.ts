import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedPromise: Promise<Map<string, string>> | null = null;

export const loadBuckets = (): Promise<Map<string, string>> => {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const { data, error } = await (supabase as any)
      .from("theme_taxonomy")
      .select("raw_theme, bucket");
    const map = new Map<string, string>();
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row?.raw_theme && row?.bucket) {
          map.set(String(row.raw_theme).trim().toLowerCase(), String(row.bucket));
        }
      }
    }
    return map;
  })();
  return cachedPromise;
};

export const useThemeBuckets = () => {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let active = true;
    loadBuckets().then((m) => {
      if (active) setMap(m);
    });
    return () => {
      active = false;
    };
  }, []);
  return map;
};

export const resolveThemeLabel = (
  buckets: Map<string, string>,
  theme: string | null | undefined,
): string | null => {
  if (!theme) return null;
  const hit = buckets.get(theme.trim().toLowerCase());
  return hit ?? theme;
};
