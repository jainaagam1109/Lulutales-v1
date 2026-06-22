const KEY_PREFIX = "lulutales_playback_rate_";

export const SPEED_STEPS = [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5];

export const getProfilePlaybackRate = (profileId: string | null | undefined): number | null => {
  if (!profileId || typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_PREFIX + profileId);
  if (!raw) return null;
  const n = parseFloat(raw);
  return SPEED_STEPS.includes(n) ? n : null;
};

export const setProfilePlaybackRate = (profileId: string | null | undefined, rate: number) => {
  if (!profileId || typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + profileId, String(rate));
  } catch {}
};

export const defaultRateForAge = (age?: number | null): number => {
  if (age == null || !isFinite(age)) return 1;
  if (age >= 2 && age <= 3) return 0.85;
  if (age === 4) return 0.9;
  if (age === 5) return 0.95;
  if (age >= 6 && age <= 9) return 1;
  return 1;
};

export const resolveInitialRate = (profileId: string | null | undefined, age?: number | null): number => {
  const stored = getProfilePlaybackRate(profileId);
  if (stored != null) return stored;
  const def = defaultRateForAge(age);
  return SPEED_STEPS.includes(def) ? def : 1;
};
