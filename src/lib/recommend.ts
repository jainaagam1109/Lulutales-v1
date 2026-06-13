import type { Story } from "@/lib/stories";

// "4" -> [4,4]; "4-7" -> [4,7]; null/empty/other -> null
export function parseAgeRange(age_group: string | null): [number, number] | null {
  if (!age_group) return null;
  const s = age_group.trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return [n, n];
  }
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    return a <= b ? [a, b] : [b, a];
  }
  return null;
}

// Stable sort by ranked priority: theme-affinity → is_featured → newest created_at.
// If childAge is null, returns the input array unchanged (caller decides fallback).
export function recommendForAge(
  stories: Story[],
  childAge: number | null,
  completedThemes: string[]
): Story[] {
  if (childAge == null) return stories;
  const winLo = childAge - 1;
  const winHi = childAge + 1;
  const themeSet = new Set((completedThemes ?? []).map((t) => t.toLowerCase()));

  const matched = stories
    .map((s, i) => ({ s, i, range: parseAgeRange(s.age_group ?? null) }))
    .filter((x) => x.range !== null && x.range![0] <= winHi && x.range![1] >= winLo);

  matched.sort((a, b) => {
    const aTheme = a.s.theme ? themeSet.has(a.s.theme.toLowerCase()) : false;
    const bTheme = b.s.theme ? themeSet.has(b.s.theme.toLowerCase()) : false;
    if (aTheme !== bTheme) return aTheme ? -1 : 1;
    const aFeat = !!a.s.is_featured;
    const bFeat = !!b.s.is_featured;
    if (aFeat !== bFeat) return aFeat ? -1 : 1;
    const aDate = a.s.created_at ?? "";
    const bDate = b.s.created_at ?? "";
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return a.i - b.i; // stability
  });

  return matched.map((x) => x.s);
}
