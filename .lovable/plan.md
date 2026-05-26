## Root cause
The app is signed in against a different backend project than the one `story_analytics` writes to.

- `Auth.tsx`, `useAuth.tsx`, and `RequireAuth.tsx` use `@/integrations/myproject/client`
- `Player.tsx` and `BedtimeReader.tsx` use `@/integrations/supabase/client`
- The auth logs already show invalid JWT / unrecognized key errors, which is exactly what happens when a token from one project is sent to another.

So the insert isn’t landing because the analytics request is reaching the database with a session token from the wrong project, and the database rejects it before/at RLS.

## Plan
1. Standardize the app on a single backend client
   - Replace the `@/integrations/myproject/client` imports in the auth/session layer with `@/integrations/supabase/client`
   - Keep `Player.tsx` and `BedtimeReader.tsx` unchanged unless needed for import consistency

2. Remove the stale custom client from the auth path
   - Ensure `Auth.tsx`, `useAuth.tsx`, and `RequireAuth.tsx` all read/write the same session storage and token source
   - This makes login, profile validation, and analytics all use the same authenticated session

3. Validate the fixed flow
   - Sign in
   - Load a bedtime reader page and an audio player page
   - Confirm `story_analytics` receives rows

## Technical notes
- No UI changes
- No schema changes
- No analytics logic changes required
- This is a client mismatch bug, not a table-structure bug