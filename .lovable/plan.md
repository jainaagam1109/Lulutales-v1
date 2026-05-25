## Why the table is empty

The inserts in `Player.tsx` and `BedtimeReader.tsx` are wrapped in `try { ... } catch {}`, so any failure is silently swallowed. Two failure modes are likely:

1. **RLS rejection.** `story_analytics` INSERT policy is `owns_profile(profile_id)`, which requires an authenticated session whose `auth.uid()` owns the `child_profiles` row matching the `lulutales_profile_id` from localStorage. If there is no Supabase session at insert time (you're sitting on `/auth`), or the localStorage profile id doesn't belong to the current user, the insert is denied.
2. **Skipped early return.** If `localStorage.getItem("lulutales_profile_id")` is null, or `story.id` / `playing` isn't ready, the effect returns before inserting.

## Plan

### 1. Make the failure visible (temporary diagnostics)
In both `src/pages/Player.tsx` and `src/pages/BedtimeReader.tsx`, replace the empty `catch {}` with a `console.warn("[analytics] insert failed", error)` that also logs when the early-return branch is hit (missing profileId / story.id / no session). Also log the current `auth.getUser()` result alongside the attempted profile_id.

This will tell us in one play whether it's an RLS denial, a missing profile id, or a missing session.

### 2. Fix based on what we see
- **If RLS denial with a valid session**: the `lulutales_profile_id` in localStorage doesn't match a `child_profiles` row owned by the user. Fix the profile-selection flow so it only stores ids that belong to `auth.uid()`, and clear stale ids on logout/login.
- **If no session**: the analytics call must run only when authenticated, OR we gate playback behind auth. Confirm which behavior you want. (Allowing anonymous analytics would require an RLS change and a separate identity strategy — not recommended.)
- **If missing profile id**: ensure the profile is set before navigating to Player/BedtimeReader, or fall back to the first owned profile.

### 3. Verify
After the fix, play one audio episode and open one bedtime story, then re-run `select count(*) from story_analytics` to confirm rows land.

## Question for you
Should playback (and therefore analytics) require a logged-in session in all cases? Answering this tells me whether step 2 is "fix the profile id flow" or "also relax the auth gate".
