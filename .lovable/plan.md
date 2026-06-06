## Goal

Force every personalised/bedtime story's `thumbnail` to match the theme → emoji map exactly. Pre-recorded admin stories are left untouched.

## Why a SQL file (not a migration)

The app's `src/integrations/supabase/client.ts` is hardcoded to your own Supabase project (`lidbfkytoajumnhwlcry`). Lovable's migration/insert tools only have access to the original Lovable Cloud project (`uvxzygypxccibioctkxy`), so anything I run here will not touch the database the live app reads from. The deliverable is a SQL file you paste into your own project's SQL editor.

## What will change

1. Create `scripts/backfill-theme-thumbnails.sql` containing a single `UPDATE public.stories` that:
   - Sets `thumbnail` using a `CASE lower(btrim(theme))` block covering all 108 themes from `src/lib/themeEmoji.ts`.
   - Falls back to `📖` when the theme doesn't match any known label.
   - Scoped with `WHERE story_type IN ('personalised_audio', 'bedtime_text')` so admin-uploaded `pre_recorded` stories keep their existing thumbnails.
   - Overwrites every matched row's thumbnail, including ones that currently hold a wrong emoji (e.g. "Being honest" → 🦁 becomes 🪞).

2. No code changes. `PersonalisedStoryForm.tsx` already writes `getThemeVisual(form.theme.trim()).emoji` on insert, so future stories are already correct.

## How you run it

1. Open your Supabase project → SQL editor.
2. Paste the contents of `scripts/backfill-theme-thumbnails.sql`.
3. Run it. The output will report the number of rows updated.

## Out of scope

- Admin `pre_recorded` stories (intentionally untouched).
- Any change to `episodes`, `story_tags`, or other tables.
- Any change to the app code or RLS.

Switch to build mode to create the SQL file.
