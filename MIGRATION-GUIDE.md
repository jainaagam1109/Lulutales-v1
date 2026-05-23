# Migrating Lulutales to your own Supabase project

You're moving from Lovable Cloud (ref `uvxzygypxccibioctkxy`) to your own Supabase project (ref `lidbfkytoajumnhwlcry`, URL `https://lidbfkytoajumnhwlcry.supabase.co`).

## ✅ What the code change already did

- Added `src/integrations/myproject/client.ts` — a new Supabase client hardcoded to your project URL + anon key.
- Switched every `import { supabase } from "@/integrations/supabase/client"` to `@/integrations/myproject/client`.
- Left the auto-managed files (`src/integrations/supabase/client.ts`, `types.ts`, `.env`) alone. They still point at Lovable Cloud but are no longer used.

**Result:** the running app now talks to *your* Supabase project. Until you finish the steps below, the app will fail (no tables, no users).

---

## Step 1 — Create the schema

1. Open https://supabase.com/dashboard/project/lidbfkytoajumnhwlcry/sql/new
2. Paste the contents of [`migration-to-own-project.sql`](./migration-to-own-project.sql)
3. Run it.

This creates: 6 tables, 2 helper functions (`owns_profile`, `can_access_story`), all RLS policies, and the public `stories-audio` storage bucket with policies.

⚠️ **Security note**: the original Lovable Cloud project had an "Anyone can update stories" policy that let any user (including anonymous) UPDATE any story row. This is intentionally **omitted** from the migration script. Don't re-enable it unless you have a specific reason.

## Step 2 — Configure auth

In **Authentication → Providers** of your project:

- **Email**: enable. Decide whether to require email confirmation (default = yes; the app currently expects users to verify before sign-in).
- **Google OAuth**: enable if you want Google sign-in (the app's `Auth.tsx` calls `signInWithOAuth("google", …)`). You'll need a Google Cloud OAuth client; paste its client ID + secret into Supabase, then add `https://lidbfkytoajumnhwlcry.supabase.co/auth/v1/callback` to the Google console's authorized redirect URIs.

In **Authentication → URL Configuration**:

- **Site URL**: your deployed app URL (or `http://localhost:5173` for local dev).
- **Redirect URLs**: add your published URL + any preview/dev URLs you use.

(Optional but recommended) In **Authentication → Providers → Email**, enable **Leaked Password Protection (HIBP)**.

## Step 3 — Migrate existing data (optional)

If you want the existing child profiles / stories / etc. to come along:

### 3a. Export from Lovable Cloud

1. Open https://supabase.com/dashboard/project/uvxzygypxccibioctkxy/editor
2. For each table (`child_profiles`, `stories`, `episodes`, `story_tags`, `story_analytics`, `user_library`):
   - Click the table → top-right `...` → **Export data as CSV**
3. For storage: download files from the `stories-audio` bucket (Storage → bucket → select all → Download).

### 3b. Migrate auth users

1. Lovable Cloud: **Authentication → Users → Export users** (CSV).
2. Your project: **Authentication → Users → Import users** (CSV).
3. ⚠️ **Passwords for email/password users do NOT transfer.** Users will need to use "Forgot password" on first login. Google-OAuth users sign in fine.
4. **User IDs are preserved**, so foreign keys (`user_id`, `owner_profile_id`, etc.) in your row exports will still resolve.

### 3c. Import the rows

For each CSV from 3a, in your project: **Table Editor → table → Insert → Import data from CSV**.
Import order matters because of logical references:
1. `child_profiles`
2. `stories`
3. `episodes`, `story_tags`, `story_analytics`, `user_library`

### 3d. Re-upload audio files

Drag the downloaded `stories-audio` files into the new bucket (same paths). The `audio_url` values in `episodes` use full URLs that include the project ref, so if you imported them as-is they still point at Lovable Cloud. Two options:
- **Easiest**: run a SQL update to swap the host:
  ```sql
  UPDATE public.episodes
  SET audio_url = REPLACE(audio_url,
    'https://uvxzygypxccibioctkxy.supabase.co',
    'https://lidbfkytoajumnhwlcry.supabase.co')
  WHERE audio_url LIKE '%uvxzygypxccibioctkxy%';
  ```
- Or regenerate URLs from your code.

## Step 4 — Verify

1. Restart / reload the app preview.
2. Sign up a new test user → confirms auth works.
3. Complete onboarding → confirms `child_profiles` insert works (RLS).
4. Generate a story → confirms `stories` table + any edge functions.
5. Open the published / deployed URL with the migrated user account → confirms data migration.

## What's NOT migrated

- **Lovable AI / `LOVABLE_API_KEY`** lived in Lovable Cloud secrets. If any client code calls Lovable AI (look for `lovable.ai...`), it will still work because the Lovable AI gateway is independent of which Supabase you use. If you had edge functions on Lovable Cloud (none in this repo today), they'd need to be redeployed on your own project via the Supabase CLI.
- **`SUPABASE_SERVICE_ROLE_KEY`** for your new project lives in **your** dashboard → Project Settings → API → `service_role` key. Never put it in frontend code.

## Rolling back

To revert to Lovable Cloud, change every `@/integrations/myproject/client` import back to `@/integrations/supabase/client` (or delete the `myproject` folder and run the same sed in reverse). The auto-managed Lovable Cloud client is untouched and ready.
