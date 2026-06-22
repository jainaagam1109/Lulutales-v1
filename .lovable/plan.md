## Goal

Seed the audio player's playback speed from the active child profile's age on first play, then remember the user's manual choice per profile.

## Speed buckets

- age 2–3 → 0.85x
- age 4   → 0.9x
- age 5   → 0.95x
- age 6–9 → 1x
- missing / <2 / >9 → 1x

## Changes

### 1. `src/lib/lastStory.ts` (or a small new helper in `src/lib/playbackRate.ts`)

Add per-profile playback-rate helpers backed by localStorage:

- Key: `lulutales_playback_rate_<profileId>`
- `getProfilePlaybackRate(profileId)` → number | null
- `setProfilePlaybackRate(profileId, rate)` → persists rate
- `defaultRateForAge(age?: number | null)` → applies the bucket table above, falling back to 1.

### 2. `src/pages/Player.tsx`

Replace the current global `lulutales_playback_rate` logic:

- Initial `speed` state resolves in this order:
  1. Per-profile stored rate for the active profile (if present and in `SPEED_STEPS`).
  2. `defaultRateForAge(activeProfile.age)` snapped to nearest `SPEED_STEPS` value.
  3. `1`.
- Active profile id + age come from the existing `activeProfile` helpers (`getActiveProfileId`, plus a small read from `child_profiles` or the cached `lulutales_child_age` in `localStorage` that `activeProfile.ts` already maintains — no new query needed).
- The effect that writes `localStorage.setItem("lulutales_playback_rate", ...)` is replaced with `setProfilePlaybackRate(profileId, speed)` so each profile remembers its own last choice.
- If the active profile changes while the Player is mounted (rare), re-evaluate the initial speed using the same resolution order.

### 3. Migration / cleanup

- Remove the old global `lulutales_playback_rate` write. Reading it is not needed — we just let the age default kick in for profiles with no stored rate yet.

## Out of scope

- No backend/schema changes; rate stays in localStorage.
- No UI changes to the +/− speed control itself.
- No changes to bedtime-text reading speed (audio player only).
