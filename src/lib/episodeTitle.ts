// Strips redundant story-title prefix and any "Episode N" token from an
// episode title so we never render "Episode 1 · The Paper Boat Fleet. Episode 1."
export function cleanEpisodeTitle(
  title: string | null | undefined,
  storyTitle: string | null | undefined,
  episodeNumber: number,
): string {
  if (!title) return "";
  let t = title.trim();

  // Strip leading story title (case-insensitive), optionally followed by separators.
  if (storyTitle) {
    const st = storyTitle.trim();
    if (st && t.toLowerCase().startsWith(st.toLowerCase())) {
      t = t.slice(st.length);
    }
  }

  // Remove "Episode N" tokens anywhere (e.g. "Episode 1", "Ep. 1", "Episode 01").
  t = t.replace(/\bEp(?:isode|\.)?\s*0*\d+\b/gi, "");

  // Trim stray separators / whitespace.
  t = t.replace(/^[\s\-–—:·.,|]+/, "").replace(/[\s\-–—:·.,|]+$/, "").trim();

  return t;
}
