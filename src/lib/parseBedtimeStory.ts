export type ParsedBedtimeStory = {
  title: string | null;
  summary: string;
  prose: string;
};

/**
 * Parses a bedtime story blob with this shape:
 *
 *   TITLE: [title]
 *
 *   Summary
 *
 *   [2–3 sentence summary]
 *
 *   ──────────────────────────────────────────
 *
 *   Story
 *
 *   [full story prose]
 */
export const parseBedtimeStory = (raw: string | null | undefined): ParsedBedtimeStory => {
  if (!raw) return { title: null, summary: "", prose: "" };

  // Split on a separator line made of box-drawing dashes (─) or regular dashes.
  const parts = raw.split(/\n\s*[─-]{3,}\s*\n/);
  const head = parts[0] ?? "";
  const tail = parts.slice(1).join("\n").trim();

  // Title
  const titleMatch = head.match(/^\s*TITLE\s*:\s*(.+?)\s*$/im);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Summary = everything after a "Summary" header line, inside head.
  let summary = "";
  const summaryIdx = head.search(/^\s*Summary\s*$/im);
  if (summaryIdx >= 0) {
    const afterHeader = head.slice(summaryIdx).replace(/^\s*Summary\s*$/im, "");
    summary = afterHeader.trim();
  } else {
    // Fallback: strip the TITLE line, use the rest.
    summary = head.replace(/^\s*TITLE\s*:.*$/im, "").trim();
  }

  // Prose = everything after a "Story" header line, inside tail.
  let prose = tail;
  const storyIdx = tail.search(/^\s*Story\s*$/im);
  if (storyIdx >= 0) {
    prose = tail.slice(storyIdx).replace(/^\s*Story\s*$/im, "").trim();
  }

  return { title, summary, prose };
};
