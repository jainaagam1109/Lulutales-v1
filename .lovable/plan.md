## What's happening

Two things combined to drop you on `/onboarding`:

1. **Supabase redirected to the Site URL, not `/reset-password`.** Supabase only honors `redirectTo` if the exact URL is on the project's **Additional Redirect URLs** allowlist. If it isn't, it silently falls back to the Site URL (`/`). The session gets created (recovery links auto-sign-in), `RequireAuth` sees a logged-in user with no `child_profiles`, and sends you to `/onboarding`. The recovery tokens in the URL hash are discarded along the way.

2. **The email going to a "new" address.** Supabase has email-enumeration protection on by default. For an unknown email, `resetPasswordForEmail` either sends nothing or sends a signup-style magic link — clicking that link signs the user in as a brand-new account, which again lands on onboarding. That's not really a bug, but it explains why a "new" email got a working link at all.

## Fix

### A. Make the recovery redirect actually land on `/reset-password`

Two-part fix so this works regardless of where Supabase drops the user:

1. **Add the redirect URL to the allowlist** (one-time config in Lovable Cloud → Auth → URL Configuration → Additional Redirect URLs):
   - `https://lulutales.lovable.app/reset-password`
   - `https://id-preview--8d6d4351-3899-492b-b428-d18a9dc018ed.lovable.app/reset-password`
   - `http://localhost:*/reset-password` (for dev)

2. **Defensive global handler in `AuthProvider`** (`src/hooks/useAuth.tsx`): listen for the `PASSWORD_RECOVERY` event and force-navigate to `/reset-password` no matter what page Supabase dropped the user on. This way, even if the allowlist is misconfigured or the user lands at `/` first, recovery always wins.

   ```ts
   supabase.auth.onAuthStateChange((event) => {
     if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
       window.location.replace("/reset-password" + window.location.hash);
     }
   });
   ```

3. **Guard `RequireAuth`** so it never redirects while the URL hash contains `type=recovery` — prevents the race where onboarding redirect fires before `PASSWORD_RECOVERY` is processed.

### B. Don't send reset emails to unregistered addresses (UX clarity)

Currently any email gets a vague "check your email" toast. Two options — pick one:

- **B1 (recommended, matches Supabase's enumeration-safe default):** Keep the generic success toast but reword it: *"If an account exists for that email, we've sent a reset link."* No backend change. Users with no account simply won't get a usable reset link.
- **B2:** Add a pre-check via a tiny edge function that looks up `auth.users` by email and returns a clear "no account found — sign up instead" message. More helpful but leaks account existence (enumeration risk).

## Files touched (if approved)

- `src/hooks/useAuth.tsx` — add PASSWORD_RECOVERY redirect
- `src/components/RequireAuth.tsx` — skip redirects when URL hash has `type=recovery`
- `src/pages/Auth.tsx` — reword forgot-password success toast (if B1)
- One-time manual: add redirect URLs to Cloud → Auth allowlist

No DB migrations, no new routes.

## Questions before I build

1. Confirm **B1** (generic message, safest) vs **B2** (explicit "no account" check, leaks existence)?
2. Want me to add the redirect URLs to the allowlist for you via the auth config tool, or will you add them in Cloud → Auth settings?
