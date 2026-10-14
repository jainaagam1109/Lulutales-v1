-- Step 9: let parents report app problems and ask for account deletion from inside the app.
-- Reuses the existing story_reports table (already shown in Admin → Reports):
--   * a report no longer has to be about a story
--   * two new reasons: 'app_problem' and 'delete_account'
-- Safe to run more than once. Existing reports are untouched.

alter table public.story_reports alter column story_id drop not null;

alter table public.story_reports drop constraint if exists story_reports_reason_check;
alter table public.story_reports add constraint story_reports_reason_check
  check (reason = any (array['not_right', 'names_details', 'audio', 'other', 'app_problem', 'delete_account']));

-- Keep messages a sensible length.
alter table public.story_reports drop constraint if exists story_reports_note_length;
alter table public.story_reports add constraint story_reports_note_length
  check (note is null or char_length(note) <= 2000);
