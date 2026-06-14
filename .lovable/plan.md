## Auto-redirect from "Creating magic" screen to Happy Place after 30s

**Scope:** Applies to both story types (personalised audio and bedtime text) since both flows render the same `src/pages/Generating.tsx` screen at `/generating/:storyId`. No other screens touched.

### Behavior
- On mount of `Generating.tsx`, start a 30-second timer.
- When it fires, navigate to `/happy-place` — only if:
  - the story is still in `preparing` state (not ready, not stale/failed), and
  - the user hasn't already navigated away.
- If the user taps the existing "Go to My Happy Place →" CTA before 30s, cancel the timer (manual nav wins).
- If the story becomes ready within 30s, the existing success path already redirects to the player/reader — cancel the timer so we don't override it.
- If the story enters a failure state (`stale` / `lang_age_failed`), the screen swaps to `StoryStatusCard`; cancel the timer so we don't yank a user away from the error UI.
- The `stalled` (>10 min) branch is unaffected — by then the timer has long since fired or been cleared; if somehow still mounted, we don't auto-redirect in stalled state either.

### Implementation (single file: `src/pages/Generating.tsx`)
1. Add a `useEffect` that runs once on mount: `const t = setTimeout(() => nav("/happy-place"), 30000); return () => clearTimeout(t);`
2. Store the timeout id in a `useRef` so other effects/handlers can clear it early.
3. Clear the timer in three places:
   - the existing `data.is_generated` success branch (right before the 1.5s nav delay),
   - when `status` becomes `stale` or `lang_age_failed`,
   - on unmount (cleanup return).
4. No change to the CTA itself — clicking it unmounts the page, which triggers the cleanup and cancels the timer automatically.

### Not changed
- No copy changes on the screen (no countdown shown — keeps UI identical to the screenshot). If you'd like a visible "Redirecting in Ns…" hint, say the word and I'll add it.
- No changes to `AudioStoryForm.tsx`, `BedtimeStoryForm.tsx`, routing, analytics, or the stalled/failure flows.
- No backend or schema changes.

### Open question
Do you want a visible countdown ("Taking you to Happy Place in 12s…") under the CTA, or keep the screen visually identical and just auto-redirect silently at 30s?
