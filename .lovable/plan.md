# Auth Improvements & Branding Update

## 1. Forgot Password + Reset Page

**`/auth` page**
- Add a "Forgot password?" link under the password field (visible in `signin` mode).
- Clicking it opens an inline "Reset password" view (or toggles mode to `forgot`) that takes just an email and calls:
  ```ts
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  ```
- Show a toast: "Check your email for a reset link."

**New `/reset-password` page (public route)**
- Add route in `src/App.tsx` (NOT wrapped in `RequireAuth`).
- On mount, Supabase auto-exchanges the recovery link into a temporary session (`type=recovery` in URL hash). The page detects this via `onAuthStateChange` `PASSWORD_RECOVERY` event.
- Form: new password + confirm password → `supabase.auth.updateUser({ password })`.
- On success: sign out, toast, redirect to `/auth`.
- Styled to match `PhoneShell` aesthetic of the existing Auth page.

## 2. Profiles Table

Create `public.profiles` for per-user (parent) data — distinct from `child_profiles`.

Columns:
- `id` (uuid, PK)
- `user_id` (uuid, unique, FK semantics to `auth.users`)
- `display_name` (text)
- `avatar_url` (text)
- `created_at`, `updated_at`

Setup:
- GRANTs for `authenticated` + `service_role` (no `anon`).
- RLS: users can `select/insert/update` only their own row (`auth.uid() = user_id`).
- `update_updated_at_column()` trigger.
- `handle_new_user()` trigger on `auth.users` AFTER INSERT → auto-creates a `profiles` row with `display_name` derived from `raw_user_meta_data->>'full_name'` or email local-part.

Note: No UI for editing the profile yet — the table + auto-creation is the foundation. (Ask if you want a profile edit screen too.)

## 3. Keep Email Verification ON

You listed "Auto-confirm email is disabled" as something to fix, but **leaving it disabled is the secure default** — users should verify their email before signing in. I recommend **NOT** enabling auto-confirm. Instead, I'll:
- Make sure the `/auth` signup flow shows a clear "Check your email to confirm your account" toast after signup.
- Optionally scaffold custom-branded auth emails (separate, larger task — can do later).

If you really want auto-confirm enabled (e.g. for dev/testing convenience), say so and I'll flip it.

## 4. Copy Changes

- Every occurrence of `Sign in` / `Sign In` / `signin` label → **`Login`** (UI strings only — internal variable names like `mode === "signin"` stay).
  - Files touched: `src/pages/Auth.tsx` (toggle button, header subtitle, submit button).
- Every occurrence of `Lulutales` → **`LuluTales`** across the app:
  - `src/pages/Auth.tsx` heading
  - `index.html` title + meta tags
  - `README.md`, `MIGRATION-GUIDE.md` (docs)
  - any other component strings (will grep before edit)
  - localStorage keys (`lulutales_*`) stay unchanged — internal only.

## Files to Create / Edit

**Created**
- `supabase/migrations/<ts>_profiles_and_trigger.sql` — profiles table, RLS, grants, triggers
- `src/pages/ResetPassword.tsx`

**Edited**
- `src/pages/Auth.tsx` — forgot password link + view, "Login" copy, "LuluTales" copy
- `src/App.tsx` — add `/reset-password` route (public)
- `index.html` — title/meta to "LuluTales"
- Any other files containing the string `Lulutales` (will rg first)

## Open Questions

1. Confirm: keep email verification ON (recommended) — or do you want auto-confirm enabled?
2. Do you also want a **profile edit UI** (parent display name + avatar) on `/profile`, or just the table + auto-creation for now?
