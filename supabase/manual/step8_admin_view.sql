-- LuluTales revamp: admin view (Requests, Families, Reports).
-- Read-only lists for admins, plus one function to approve / block / unblock a family.
-- Every function refuses anyone who is not an admin. Changes no existing data. Safe to re-run.

-- All families, with email, children, this month's stories and last listen.
create or replace function public.admin_families()
returns table (
  user_id uuid, email text, provider text, signed_up_at timestamptz,
  status text, auto_approve_at timestamptz, approved_at timestamptz, approved_by text,
  invited_by_email text, founding_number int, no_limit boolean, block_reason text,
  children jsonb, stories_this_month int, last_listened timestamptz
)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text,
         coalesce(u.raw_app_meta_data->>'provider', 'email'),
         coalesce(fa.signed_up_at, u.created_at),
         coalesce(fa.status, 'approved'), fa.auto_approve_at, fa.approved_at, fa.approved_by,
         (select iu.email::text from auth.users iu where iu.id = fa.invited_by),
         fa.founding_number, coalesce(fa.no_limit, false), fa.block_reason,
         coalesce((select jsonb_agg(jsonb_build_object('name', c.name, 'age', c.age) order by c.created_at)
                   from public.child_profiles c where c.user_id = u.id and c.status <> 'deleted'), '[]'::jsonb),
         (select count(*)::int from public.stories st join public.child_profiles c on c.id = st.child_profile_id
           where c.user_id = u.id and st.story_type in ('personalised_audio','bedtime_text')
             and st.created_at >= date_trunc('month', now())
             and coalesce(st.scoring_status,'') not in ('STALE','failed_language_age')),
         (select max(a.created_at) from public.story_analytics a join public.child_profiles c on c.id = a.profile_id
           where c.user_id = u.id)
  from auth.users u
  left join public.family_access fa on fa.user_id = u.id
  where public.is_admin()
  order by coalesce(fa.signed_up_at, u.created_at) desc;
$$;

-- Approve, block or unblock one family.
create or replace function public.admin_set_access(_user_id uuid, _action text, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.family_access (user_id, status, signed_up_at)
  values (_user_id, 'waiting', now()) on conflict (user_id) do nothing;
  if _action = 'approve' then
    update public.family_access
       set status = 'approved', approved_at = now(), approved_by = 'admin', block_reason = null,
           founding_number = coalesce(founding_number,
             (select case when coalesce(max(f2.founding_number),0) < (select founding_places from public.app_settings limit 1)
                          then coalesce(max(f2.founding_number),0) + 1 end from public.family_access f2))
     where user_id = _user_id;
  elsif _action = 'block' then
    update public.family_access set status = 'blocked', block_reason = _reason where user_id = _user_id;
  elsif _action = 'unblock' then
    update public.family_access set status = 'waiting', block_reason = null,
           auto_approve_at = now() + make_interval(hours => (select auto_approve_hours from public.app_settings limit 1))
     where user_id = _user_id;
  else
    raise exception 'unknown action %', _action;
  end if;
end $$;

-- Reports with the story title and the parent's email.
create or replace function public.admin_reports()
returns table (id uuid, created_at timestamptz, reason text, note text, status text, episode_number int,
               story_id uuid, story_title text, is_library boolean, parent_email text)
language sql stable security definer set search_path = public, auth as $$
  select r.id, r.created_at, r.reason, r.note, r.status, r.episode_number,
         r.story_id, s.title, (s.story_type = 'pre_recorded'), u.email::text
  from public.story_reports r
  left join public.stories s on s.id = r.story_id
  left join auth.users u on u.id = r.user_id
  where public.is_admin()
  order by r.created_at desc;
$$;

revoke all on function public.admin_families() from public, anon;
revoke all on function public.admin_set_access(uuid, text, text) from public, anon;
revoke all on function public.admin_reports() from public, anon;
grant execute on function public.admin_families() to authenticated;
grant execute on function public.admin_set_access(uuid, text, text) to authenticated;
grant execute on function public.admin_reports() to authenticated;
