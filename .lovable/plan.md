# Less aggressive onboarding + multi-child + age 2–9

## 1. Stop forcing onboarding on profile-less users
**`src/components/RequireAuth.tsx`**
- When `kids.length === 0`, no longer set `redirectTo = "/onboarding"`. Instead clear the stale localStorage keys and let the user through to whatever route they requested.
- Keep the bypass list (`/onboarding`, `/select-profile`, `/add-child`).
- Still set `profileValidatedForUserId` once auth+lookup completes so we don't re-query per nav.
- Result: a new signed-in user lands on `/` (Home) and can browse pre-recorded catalog, `/happy-place`, `/story/:id`, `/player/:id`.

**Gate only the personalised flows** (the places that actually need a child profile):
- `src/pages/MagicHub.tsx`, `src/pages/AudioStoryForm.tsx`, `src/pages/BedtimeStoryForm.tsx` → on mount, if no `lulutales_profile_id`, redirect to `/onboarding` (single-profile first-time flow). The existing in-form "No child profile found" banner in `PersonalisedStoryForm` becomes a fallback for race conditions.

## 2. Fix "Add child" so a 2nd/3rd profile can be created
**New route `/add-child`** in `src/App.tsx` → renders the same `Onboarding` component, wrapped in `RequireAuth`.

**`src/pages/Onboarding.tsx`**
- Detect add-mode: `useSearchParams().get("mode") === "add"` OR `useLocation().pathname === "/add-child"`.
- In add-mode:
  - SKIP the "existing profile → redirect home" effect entirely.
  - SKIP the duplicate-check `select().maybeSingle()` inside `submit`.
  - Always `INSERT` a new `child_profiles` row, set localStorage active id/name/age to the new row, then `nav("/")`.
  - Change page copy heading from "About your child" to "Add a child".
- In normal mode: keep current behaviour, but replace the pre-fill `.maybeSingle()` lookup with `.limit(1).maybeSingle()` (or `.order(...).limit(1)` then read `[0]`) so 2+ existing rows don't throw `PGRST116`. Same fix inside `submit`.

**`src/pages/Profile.tsx`**
- "Add child" button (in the kids panel — find the existing `nav("/onboarding")` call near `Plus` icon) → `nav("/add-child")`.
- `src/pages/SelectProfile.tsx` "Add child" tile also → `/add-child` (so users adding a 2nd kid from there work too).

## 3. Enforce ages 2–9 everywhere
| Location | Current | New |
| --- | --- | --- |
| `src/pages/Onboarding.tsx` zod schema | `min(1).max(18)` | `min(2).max(9)` with message "Stories are crafted for ages 2–9." |
| `src/pages/Profile.tsx` `saveKid` | `< 2 \|\| > 14` | `< 2 \|\| > 9` + same message; input `min={2} max={9}` |
| `src/components/PersonalisedStoryForm.tsx` `submit` | only checks `isNumeric` | also reject `< 2 \|\| > 9` with same message |
| `src/components/StoryFormFields.tsx` (if `isNumeric` is the only check used elsewhere) | unchanged | leave; add range check at call sites |

Add helper text under every Age field: `"Stories are crafted for ages 2–9."` — locations:
- Onboarding age field
- Profile inline-edit age field
- `PersonalisedStoryForm` age field

## 4. Privacy line on data-entry screens
Add a single muted paragraph (`text-[11px] text-muted-foreground`) at the top of the form section:
> "Your child's details stay private to your account — never sold or shared — and are used only to personalise stories."

Places to add it:
- `src/pages/Onboarding.tsx` — under the "About your child" subtitle.
- `src/components/PersonalisedStoryForm.tsx` — under the page subtitle (before `Section "Basic details"`).
- `src/pages/Profile.tsx` — once at the top of the edit panel (parent edit section AND inside the kid edit form, once each).

## Out of scope (per instructions)
- No Supabase schema changes.
- No auth/login changes.
- BedtimeReader header untouched.
- Backend age-range stays whatever it is; we only constrain the UI.

## Technical notes
- The existing `profileValidatedForUserId` module flag is fine to keep; we just stop redirecting when kids are empty.
- The "Couldn't load saved profile" toast in `PersonalisedStoryForm` already handles stale ids — leaving that alone.
- No new dependencies. No CSS/token changes.
