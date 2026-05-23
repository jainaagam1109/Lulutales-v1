## Why the form looks empty

Two things combine:

1. **`PersonalisedStoryForm.tsx` swallows fetch failures.** The `supabase...maybeSingle().then(...)` call has no `.catch`, no error toast, and no fallback when `data` is `null` (stale or missing `lulutales_profile_id` in localStorage). On failure the form just renders empty placeholders.
2. **Your user has 2 `child_profiles` rows for the same kid** (confirmed via DB query). If `localStorage.lulutales_profile_id` points at a row that was later replaced or doesn't match, the fetch returns no data. Onboarding's duplicate-guard already exists but earlier sessions created the dupes.
3. Even on a successful fetch, only the fields Onboarding actually captured (`name, age, gender, family_type, sibling_age`) can prefill. `city, personality, home_type, family_members, last_theme, last_occasion` are all `null` in the DB, so those sections stay empty by design — but Basic details (name/age/gender) should populate.

## Changes

### `src/components/PersonalisedStoryForm.tsx`
- Wrap the prefill fetch in try/catch; on error or `data === null`, log to console and show a soft `toast.info("Couldn't load saved profile — please re-enter details.")`.
- If `data === null`, also fall back to reading `lulutales_child_name` / `lulutales_child_age` from localStorage so at least Basic details prefill.
- If `profileId` exists in localStorage but the row isn't found, clear the stale key so RequireAuth re-runs the selection flow next time.

### `src/pages/Onboarding.tsx`
- The duplicate-guard at line 76–88 runs **before** validation but only after the user clicks Continue. Move the existing-profile check into a `useEffect` that runs on mount so a returning user is redirected to `/` immediately and never sees an empty Onboarding form (this is what likely created the duplicate "Ast" rows you have now).

### Optional cleanup (ask first)
- One-time: delete the older duplicate row in `child_profiles` so localStorage and DB are in sync. I'll only run this if you confirm which row to keep.

## Technical notes
- No schema changes.
- No new dependencies.
- Touches only the two files above.
- Existing `maybeSingle()` semantics preserved; only error paths and a localStorage fallback are added.
