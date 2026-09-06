# Autoplay across stories + wait-time copy fix

## Change 1 — wait-time copy (tiny)

On the "Generating" screen, the text-story line reads "~4 minutes". Change that single number to "~3 minutes". The audio line ("~15 minutes") stays as it is. One-word edit in `src/pages/Generating.tsx`.

## Change 2 — autoplay from one story to the next

When a child finishes every episode of an audio story, the app waits a few seconds and then starts another story automatically. On by default, only for personalised audio stories and pre-recorded library stories. Text stories are never involved.

### How the next story is chosen

1. First, other personalised audio stories for the same child that haven't played in this listening run, newest first.
2. When those run out (or there are none), pre-recorded stories that suit the child's age: finish one world before moving to the next, and after the last world, start again from the first world (still skipping anything already played in this run).
3. If the child started inside a pre-recorded world, that world is the starting point.
4. Pre-recorded stories that belong to no world form a final catch-all group, played after all worlds are exhausted.

"Already played" is remembered only for the current run — closing the app or tab forgets it. No database changes and no new tables or columns are needed for any of this.

### Safety and controls

- After 3 automatic story switches in a row, autoplay pauses and asks "Keep going?" instead of continuing forever.
- A "Stop autoplay" button is visible the whole time autoplay is active or counting down, next to the existing countdown card.
- The countdown card gains a second mode: "Next story: <title> in Ns" with Play now / Stop autoplay.
- If the next story's audio is missing or fails to load, it is skipped and the next candidate is tried (up to a small number of attempts) so playback never gets stuck.
- A parent setting to turn autoplay off is included as a simple stored preference on the device (default on).

## Technical notes

**Database:** none required. Everything uses existing tables (`stories`, `episodes`) and existing columns (`story_type`, `child_profile_id`, `age_group`, `universe_id`, `created_at`).

Note: the app's client points at a migrated backend project, so the schema visible from here is stale; the plan assumes `stories.universe_id` and a `universes` table exist there, as the current player and worlds pages already query them. This gets confirmed as the first implementation step.

**Files affected**
- `src/pages/Generating.tsx` — copy change only.
- New `src/lib/autoplayQueue.ts` — session-scoped played-set (in-memory module singleton), candidate fetching, and `pickNextStory({ profileId, childAge, currentStory })` returning the next story id, or null.
- New `src/hooks/useAutoplay.ts` (or logic inline in Player) — run state: active flag, advance counter, countdown, stop.
- `src/pages/Player.tsx` — in the `ended` handler, when `!hasNext` (last episode) and the story type is audio/pre-recorded and autoplay is enabled, start a cross-story countdown instead of just stopping; on countdown end navigate to `/player/<nextId>/1` with the existing `shouldAutoplayRef` mechanism so the new audio starts. Extend the countdown card UI.
- Possibly `src/lib/stories.ts` — one or two new fetch helpers (personalised audio for a profile; pre-recorded by age, grouped by universe), reusing `isRenderable` and `parseAgeRange`/`ageDistance`.

**Analytics:** untouched. The player already re-registers its analytics effect per `story.id`/`episode.id`, and the 30-minute de-dupe key is per episode, so each auto-advanced story logs `start`/`play`/`complete` normally. `playback_progress` and the local "last story" keys also keep working because navigation goes through the same route as today.

**Risks**
- Mobile autoplay policy: audio started without a user gesture can be blocked. In practice the run begins from a tap and the audio element stays in the same tab, so continuation usually succeeds; the existing `.catch(() => {})` on `play()` means a block leaves the player paused rather than broken. The countdown card doubles as the manual "Play now" fallback.
- Background tabs / locked screens throttle timers, so a countdown may fire late. Acceptable; the play attempt still happens on resume.
- Route-level remount: navigating to a new story unmounts the audio element, so there is a brief gap and the "resume saved position" logic must not fight the fresh start — new stories start at episode 1 position 0 unless a genuine saved position exists.
- Repeated skipping when many stories lack audio; capped by a retry limit and then a graceful stop.
- Queue fetching adds a couple of extra queries per advance; results are cached per run.

**Effort:** Change 1 is minutes. Change 2 is a medium piece of work — roughly a day: queue library and ordering rules are the bulk, player wiring and UI a smaller part, plus manual testing of the advance/skip/limit paths on mobile.
