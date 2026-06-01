## Auth UX improvements in `src/pages/Auth.tsx`

### 1. Failed login (wrong password OR no account)
On `signInWithPassword` error where message is `"Invalid login credentials"`:
- Show toast: **"New here? Sign up below — or try your password again."**
- Stay on Login mode (no auto-toggle)
- Keep email, clear password field
- Other errors (rate limit, network, etc.) → show actual error message

### 2. Signup with existing email → redirect to Login
Supabase signals an existing user when `data.user.identities` is an empty array (with email confirmation enabled). Detect this and also catch `error.message` containing `"already registered"`:
- Show toast: **"Welcome back to LuluTales! Please login 👋"**
- Switch `mode` to `"signin"`
- Preserve email, clear password

### 3. Password too short on signup
- Add inline helper text under password field in signup mode: *"Use at least 6 characters."*
- On submit, the existing zod validation already shows a toast — keep it
- Add live red border + red helper text once user has typed 1+ chars and length < 6

### Files
- `src/pages/Auth.tsx` (only file touched)

No DB, backend, or routing changes.
