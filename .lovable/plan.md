# Migrate to your own Supabase project

Switch the app from Lovable Cloud (ref `uvxzygypxccibioctkxy`) to your own Supabase project (ref `lidbfkytoajumnhwlcry`, URL `https://lidbfkytoajumnhwlcry.supabase.co`).

## Important caveats

- Lovable Cloud cannot be disabled on this project. The auto-generated files `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, and `.env` will keep pointing at Lovable Cloud and may be overwritten. We work around this by adding a new client file and migrating all imports to it.
- Auth users, edge functions, storage objects, and existing rows in Lovable Cloud do NOT move automatically. You'll need to run the SQL script and follow the data export guide manually.
- After migration, any future Lovable tool that touches the database (migrations, `read_query`, etc.) will still operate on Lovable Cloud, not your project. Schema changes after this point need to be applied to your own project manually.

## What I'll change in the codebase

1. **New client file** `src/integrations/myproject/client.ts`
   - Hardcodes your project URL and anon key (anon keys are safe in frontend code).
   - Reuses the existing `Database` type from `src/integrations/supabase/types.ts` (per your choice).

2. **Migrate every import** across the codebase from `@/integrations/supabase/client` to `@/integrations/myproject/client`. Affected files (all `src/**/*.ts(x)` that import the client):
   - `src/components/RequireAuth.tsx`
   - `src/hooks/useAuth.tsx`
   - `src/lib/stories.ts`
   - `src/pages/Auth.tsx`, `Onboarding.tsx`, `SelectProfile.tsx`, `HappyPlace.tsx`, `Generating.tsx`, `Dashboard.tsx`, `Home.tsx`, `Library.tsx`, `Profile.tsx`, `StoryDetail.tsx`, `Player.tsx`, `BedtimeReader.tsx`, `Admin.tsx`, `MagicHub.tsx`, `Insights.tsx`, `AudioStoryForm.tsx`, `BedtimeStoryForm.tsx`, `PersonalisedStoryForm.tsx` (any that use supabase)
   - I'll grep for `from "@/integrations/supabase/client"` and update each match.

3. **Leave `client.ts`, `types.ts`, `.env` untouched** — they are auto-managed.

## What you'll do manually in your Supabase dashboard

### Step A — Run the schema SQL

I'll generate a single SQL file `migration-to-own-project.sql` containing:
- All 6 tables (`child_profiles`, `stories`, `episodes`, `story_tags`, `story_analytics`, `user_library`) with exact columns/defaults
- Both functions (`owns_profile`, `can_access_story`) as `SECURITY DEFINER`
- All RLS policies (enable RLS + every policy currently defined)
- Storage bucket `stories-audio` (public) with appropriate policies
- Note: I'll flag the existing `"Anyone can update stories"` policy (currently `public` role, `using true`) as a security risk — you can choose to tighten it.

You run this in **Supabase Dashboard → SQL Editor** of your own project.

### Step B — (Optional) Migrate existing data

I'll include a guide covering:
1. Export each table from Lovable Cloud as CSV (Dashboard → Table Editor → Export)
2. Import CSVs into your own project (Table Editor → Import)
3. Caveats: `user_id` / `owner_profile_id` references won't resolve unless you also migrate auth users
4. **Auth users**: export via Supabase Dashboard → Authentication → Users (CSV), then import into your own project. Passwords won't transfer for email/password users — they'll need to reset.

### Step C — Recreate edge functions & secrets (if any)

This project currently has no custom edge functions in `supabase/functions/`, so nothing to migrate there. The Lovable Cloud secrets (`LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) stay with Lovable Cloud — your own project has its own service-role key in its dashboard.

### Step D — Auth settings

In your own Supabase project: configure email auth, Google OAuth (if you use it), redirect URLs, and email templates to match what you have today.

## Technical details

- New client: `createClient<Database>(YOUR_URL, YOUR_ANON_KEY, { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } })` — same options as current.
- Anon key (provided): `eyJhbGciOi...EQ41g0` — safe to commit.
- Types file stays at `src/integrations/supabase/types.ts`. Since the schema you create will mirror it, types stay valid. If you later diverge, regenerate with `supabase gen types typescript --project-id lidbfkytoajumnhwlcry`.

## Deliverables after implementation

- Code: new client file + updated imports.
- File at repo root: `migration-to-own-project.sql` (run in your dashboard).
- File at repo root: `MIGRATION-GUIDE.md` (data export + auth + post-migration checklist).

## Out of scope

- Actually executing the SQL in your project (you do that).
- Migrating auth users / row data (manual, with guide).
- Removing Lovable Cloud (not possible).
