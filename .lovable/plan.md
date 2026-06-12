# LuluTales — three fixes

## Fix 1 — Back-after-add returns to the form

`src/pages/Onboarding.tsx`, inside `submit()`:

- Change the early-return navigation (when an existing profile is found) from `nav("/")` to `nav("/", { replace: true })`.
- Change the final post-insert navigation from `nav("/")` to `nav("/", { replace: true })`.

The "added another child" path (`nav("/profiles")` in add-mode) is left as-is.

---

## Fix 2 — Server-backed resume + mini player

### 2a. Database (migration)

New table `public.playback_progress`:

- `id uuid pk default gen_random_uuid()`
- `profile_id uuid not null references public.child_profiles(id) on delete cascade`
- `story_id uuid not null references public.stories(id) on delete cascade`
- `episode_id uuid references public.episodes(id) on delete set null`
- `episode_number int`
- `position_seconds double precision not null default 0`
- `duration_seconds double precision`
- `percent int not null default 0`
- `completed boolean not null default false`
- `updated_at timestamptz not null default now()`
- `UNIQUE (profile_id, story_id)`
- Index `(profile_id, updated_at desc)`

GRANTs to `authenticated` (SELECT/INSERT/UPDATE/DELETE) and `service_role` (ALL). No `anon` grant.

RLS enabled. Single `FOR ALL` policy using the existing `public.owns_profile(profile_id)` security-definer (which already checks `child_profiles.user_id = auth.uid()`), applied to both `USING` and `WITH CHECK`. `updated_at` maintained by the existing `update_updated_at_column` trigger.

### 2b. Writes — `src/pages/Player.tsx`

Keep all existing localStorage + `story_analytics` writes untouched. Add a parallel upsert layer on top.

- A `lastWriteAtRef` (ms) and an `inFlightRef` guard.
- `flushProgress(opts?: { completed?: boolean })` reads `currentTime`/`duration` off `audioRef.current` at call time (no stale closures), computes `percent` against the whole-story math already used by MiniPlayer, then upserts on conflict `(profile_id, story_id)` with the current `episode_id`, `episode_number`, `position_seconds`, `duration_seconds`, `percent`, `completed`. Skips entirely when `story.story_type === "bedtime_text"` (audio-only).
- Triggers:
  - `timeupdate` → throttled: only when `now - lastWriteAtRef >= 10_000`.
  - `pause`, `seeked` → forced flush.
  - `ended` on the last episode → forced flush with `completed: true`.
  - Component unmount → forced flush.
  - `document.visibilitychange` when hidden, and `window.pagehide` → forced flush.
- Profile id resolved from `localStorage.lulutales_profile_id`, falling back to the user's first child profile (existing pattern in the file).
- Our own programmatic resume-seek will also fire `seeked` — that re-persists the same position, idempotent, no special case.

### 2c. Resume — `src/pages/Player.tsx`

In the effect that currently sets `audio.currentTime = 0` on episode change:

- After `loadedmetadata` for the active episode, read the row for `(active profile, current story_id)`.
- Resume to `position_seconds` only when:
  - `completed === false`, AND
  - `episode_number` matches the currently loaded episode, AND
  - `position_seconds >= 5`, AND
  - `duration_seconds - position_seconds > 5` (or duration unknown).
- Otherwise start at 0.
- Keep the existing 3-second autoplay delay and episode-transition autoplay behavior unchanged.

### 2d. `useResumeProgress(profileId)` hook

New file `src/hooks/useResumeProgress.ts`. React-query key `["resume-progress", profileId]`.

- `enabled: !!profileId`.
- Query: latest `playback_progress` row for `profile_id = profileId` AND `completed = false`, ordered by `updated_at desc`, limit 1. Returns `null` when none.
- Seed-to-localStorage side effect runs **only** when `profileId` first resolves or changes (tracked via a `useRef<string | null>` of the last-seeded profile id). Background refetches do **not** re-seed.
- Seeding rules (server-wins-on-switch with a no-rewind guard):
  - Set `lulutales_last_story_<pid>` to the server's `story_id`.
  - Set `lulutales_last_ep_<pid>_<storyId>` to server `episode_number`.
  - For the position key `lulutales_pos_<pid>_<storyId>_<ep>`: if a local value exists and is **greater** than the server `position_seconds`, keep local; otherwise write server value.
  - Mirror `lulutales_story_pct_<pid>_<storyId>` with the same max-wins guard against any existing local pct.
  - Dispatch a `storage`-style event (or bump an internal tick) so `MiniPlayer`'s existing `storage` listener re-reads.

### 2e. MiniPlayer & "Continue listening" card

- `src/components/MiniPlayer.tsx`: call `useResumeProgress(activeProfileId)`. When the hook has a row, render using its `story_id`, link to `/player/{story_id}/{episode_number}`, and use its `percent`. While the hook is loading, fall back to the current localStorage-based render so first paint is unchanged. Keep the existing `bedtime_text` filter and route guards (hidden on `/player/*` and `/bedtime/*`).
- Home/Dashboard "Continue listening" card (`src/pages/Index.tsx`): same — source the ongoing story and percent from `useResumeProgress` with localStorage as first-paint fallback. **If the hook returns `null`, leave the existing `generatedStories[0]` fallback exactly as it is.**

### Out of scope for Fix 2

No removal of existing localStorage writes, no changes to `story_analytics` logging, no changes to MagicHub's inline player removal, no schema changes beyond the new table.

---

## Fix 3 — Magic Hub copy

`src/pages/MagicHub.tsx`, in the `cards` array — edit **only** these four strings, leave titles, emojis, tags, section labels untouched:

- Audio card `desc`: `"Narrated aloud for your child to listen and enjoy on their own."`
- Audio card `formatHint`: `"🎧 Press play — no reading needed · ~5–15 min"`
- Bedtime card `desc`: `"A story for you to read aloud to your child at bedtime."`
- Bedtime card `formatHint`: `"📖 You read it from the screen · ~3–10 min"`

Happy Place / story-form mirroring is deferred — not part of this change.

---

## Technical notes

- Migration order: CREATE TABLE → GRANT (authenticated + service_role) → ALTER ENABLE RLS → CREATE POLICY using `public.owns_profile(profile_id)` → CREATE INDEX → updated_at trigger.
- The `(profile_id, story_id)` uniqueness means one in-progress row per story; on auto-advance or manual episode change the same row updates forward (most-recent-wins). No per-episode memory.
- `useResumeProgress` returns the single most-recently-updated non-completed row across all of that profile's stories — both MiniPlayer and the Dashboard card read it.
- No-rewind guard during seeding prevents an offline-stale server value from clobbering a further local position.
- Flush uses `audioRef.current` reads (not closure-captured values) so unmount/hidden flushes capture the true latest position.
- `bedtime_text` stories are excluded from all `playback_progress` writes and from `useResumeProgress` consumers (matches current audio-only MiniPlayer behavior).
