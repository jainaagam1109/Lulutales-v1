import type { Story } from "@/lib/stories";
import { parseAgeRange } from "@/lib/recommend";

export const ageDistance = (
  range: [number, number] | null,
  childAge: number | null
): number => {
  if (childAge == null || range == null) return Number.POSITIVE_INFINITY;
  const [lo, hi] = range;
  if (childAge >= lo && childAge <= hi) return 0;
  return childAge < lo ? lo - childAge : childAge - hi;
};

export interface SortStoriesOpts {
  childAge: number | null;
  playCounts?: Map<string, number> | null;
  completedThemes?: string[];
}

export function sortStories(stories: Story[], opts: SortStoriesOpts): Story[] {
  const { childAge, playCounts, completedThemes } = opts;
  const themeSet = new Set((completedThemes ?? []).map((t) => t.toLowerCase()));
  const pc = playCounts ?? new Map<string, number>();

  return stories
    .map((s, i) => ({ s, i, dist: ageDistance(parseAgeRange(s.age_group ?? null), childAge) }))
    .sort((a, b) => {
      // a. age distance asc
      if (a.dist !== b.dist) return a.dist - b.dist;
      // b. play count desc
      const ap = pc.get(a.s.id) ?? 0;
      const bp = pc.get(b.s.id) ?? 0;
      if (ap !== bp) return bp - ap;
      // c. featured first
      const af = a.s.is_featured ? 1 : 0;
      const bf = b.s.is_featured ? 1 : 0;
      if (af !== bf) return bf - af;
      // d. theme affinity
      const at = a.s.theme && themeSet.has(a.s.theme.toLowerCase()) ? 1 : 0;
      const bt = b.s.theme && themeSet.has(b.s.theme.toLowerCase()) ? 1 : 0;
      if (at !== bt) return bt - at;
      // e. created_at desc
      const ad = a.s.created_at ?? "";
      const bd = b.s.created_at ?? "";
      if (ad !== bd) return bd.localeCompare(ad);
      return a.i - b.i;
    })
    .map((x) => x.s);
}
