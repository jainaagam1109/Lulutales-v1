## Overall direction

The plan is solid — it cleanly separates "ready", "in progress", "soft failure" and "hard failure (language/age)" without leaking pipeline details into the UI. Two things to flag before we build:

1. **The columns don't exist yet.** I checked the live `stories` table — there is no `scoring_status` or `generation_attempts`. We need a migration. (You mentioned they were there; they aren't in this project.)
2. **Hindi-age gating already exists** in `PersonalisedStoryForm.tsx` (`isHindiEligible`, disables Hindi button + helper text "Hindi is available for ages 2–6"). We keep it; no change.

## What to build

### 1. Schema migration

Add to `public.stories`:
- `scoring_status text` — nullable. Allowed values used by UI: `null`, `'failed_retrying'`, `'STALE'`, `'failed_language_age'`. (No DB CHECK constraint — pipeline owns the vocabulary; UI treats unknown values as in-progress.)
- `generation_attempts integer not null default 0`.
- Index: `create index on public.stories (is_generated, scoring_status)` to keep list queries fast.

RLS update: existing UPDATE policy on `stories` already allows the owning user to update their own row, so the "Try again" reset is covered. No policy change needed.

### 2. Shared status helper

New `src/lib/storyStatus.ts`:

```ts
export type StoryStatus = "ready" | "preparing" | "stale" | "lang_age_failed";
export const getStoryStatus = (s: Pick<Story,"is_generated"|"scoring_status"|"generation_attempts">): StoryStatus => {
  if (s.is_generated) return "ready";
  if (s.scoring_status === "STALE") return "stale";
  if (s.scoring_status === "failed_language_age") return "lang_age_failed";
  // null or 'failed_retrying' with attempts < 5 => preparing; otherwise treat as stale fallback
  if ((s.scoring_status === null || s.scoring_status === "failed_retrying") && (s.generation_attempts ?? 0) < 5) return "preparing";
  return "stale";
};
```

### 3. List screens (Home, Library, HappyPlace, MagicHub)

Update `StoryCard` to take status into account:
- `ready` → current behavior (link to detail / player).
- `preparing` → render a non-link card with a small spinner and "Preparing your story…". Tap goes to `/generating/:id` (already exists).
- `stale` → render a card with warning tone + "We couldn't create this story. Tap to try again." and a small "Try again" button. Clicking calls `retryStory(id)` (see §5).
- `lang_age_failed` → render a card with "Hindi stories are available for ages 2–6 only" plus two small actions: "Change language" and "Change child's age". Both route to the appropriate edit screen (language → re-open the creation form for that story prefilled; age → `/profile` for that child). No retry button.

`HappyPlace` already filters out non-generated personalised stories via `isFailed`; replace that ad-hoc filter with `getStoryStatus` so failed ones still appear (in `stale`/`lang_age_failed` form) instead of disappearing.

### 4. Story detail + player guards

- `StoryDetail`: if status !== `ready`, hide the Play/Read button and episode list; show the same status card from §3 in their place. Summary and metadata still render.
- `Player`, `BedtimeReader`, `BedtimePreview`: on load, if `is_generated === false`, redirect to `/generating/:id` (or `/` if status is `stale`/`lang_age_failed`). This enforces "never render story content unless is_generated = true".

### 5. Retry action

Add `retryStory(id)` to `src/lib/stories.ts`:

```ts
await supabase.from("stories")
  .update({ generation_attempts: 0, scoring_status: null })
  .eq("id", id);
```

Then invalidate `["stories"]`, `["story", id]`, `["library"]` queries and toast "Retrying…".

### 6. Generating page

`Generating.tsx` currently flips to "stalled" purely on age > 10 min. Update it to also surface `stale` / `lang_age_failed` immediately when those statuses appear, with the same copy + actions as the list cards.

### 7. Creation form

No code change needed for the Hindi/age rule — `PersonalisedStoryForm` already disables Hindi when `!isHindiEligible(age)` and shows the helper text. We keep it; the backend is the safety net.

## Technical notes

- `types.ts` is auto-regenerated after the migration; do not hand-edit.
- All new copy uses semantic tokens (`text-muted-foreground`, `bg-card`, `border-destructive/40`, etc.) — no raw colors.
- Query cache: list queries currently key on `["stories"]` / `["library"]` and don't filter by status, so adding the columns won't break them; we just read two extra fields.
- We treat unknown `scoring_status` values as `preparing` to stay forward-compatible with pipeline changes.

## Files touched

- `supabase/migrations/<new>.sql` — add columns + index.
- `src/lib/storyStatus.ts` — new.
- `src/lib/stories.ts` — add `retryStory`.
- `src/components/StoryCard.tsx`, `src/components/StoryCardSkeleton.tsx` — status-aware rendering.
- `src/pages/StoryDetail.tsx`, `src/pages/Player.tsx`, `src/pages/BedtimeReader.tsx`, `src/pages/BedtimePreview.tsx` — guard on `is_generated`.
- `src/pages/Generating.tsx` — react to `stale` / `lang_age_failed`.
- `src/pages/HappyPlace.tsx`, `src/pages/Home.tsx`, `src/pages/Library.tsx`, `src/pages/MagicHub.tsx` — render through status-aware card.

## Open question

For the "Change language" action on `lang_age_failed`, do you want it to (a) reopen the creation form prefilled with the original story params (requires we stored them in `generation_params`), or (b) just delete the failed row and send the user back to a fresh creation form? I'll default to (a) if `generation_params` is populated, else (b).
