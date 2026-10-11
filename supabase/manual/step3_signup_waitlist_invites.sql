-- LuluTales revamp, step 3: sign-up waitlist, auto-approval and invites.
-- Additive only: creates functions and one trigger. Changes no existing data.
-- Safe to run more than once.

-- 1) Every new sign-up gets a "waiting" record, auto-approved after N hours.
create or replace function public.handle_new_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.family_access (user_id, status, signed_up_at, auto_approve_at)
  select new.id, 'waiting', now(), now() + make_interval(hours => coalesce(s.auto_approve_hours, 48))
  from (select auto_approve_hours from public.app_settings limit 1) s
  on conflict (user_id) do nothing;
  return new;
exception when others then
  -- Never let this block a sign-up; an admin can fix the record later.
  raise warning 'handle_new_family failed for %: %', new.id, sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_created_family on auth.users;
create trigger on_auth_user_created_family
  after insert on auth.users
  for each row execute function public.handle_new_family();

-- 2) Next founding-family number (null once all places are taken).
create or replace function public.next_founding_number()
returns integer language sql security definer set search_path = public as $$
  select case when coalesce(max(founding_number), 0) < (select founding_places from public.app_settings limit 1)
              then coalesce(max(founding_number), 0) + 1 end
  from public.family_access;
$$;

-- 3) Called by the app: if this family's 48 hours are up, approve them now.
create or replace function public.claim_auto_approval()
returns text language plpgsql security definer set search_path = public as $$
declare st text;
begin
  update public.family_access fa
     set status = 'approved', approved_at = now(), approved_by = 'auto',
         founding_number = coalesce(fa.founding_number, public.next_founding_number())
   where fa.user_id = auth.uid() and fa.status = 'waiting'
     and fa.auto_approve_at <= now()
     and (select auto_approve_enabled from public.app_settings limit 1);
  select status into st from public.family_access where user_id = auth.uid();
  return coalesce(st, 'approved');
end $$;

-- 4) This family's own invite code (made the first time it's asked for).
create or replace function public.my_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then return null; end if;
  select code into c from public.invites where inviter_id = auth.uid() limit 1;
  if c is null then
    loop
      c := upper(substr(md5(gen_random_uuid()::text), 1, 6));
      exit when not exists (select 1 from public.invites where code = c);
    end loop;
    insert into public.invites (code, inviter_id) values (c, auth.uid());
  end if;
  return c;
end $$;

-- 5) Use a friend's invite: a waiting family skips the wait; the inviter earns bonus stories this month.
create or replace function public.redeem_invite(_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then return false; end if;
  select * into inv from public.invites where code = upper(trim(_code));
  if not found or inv.inviter_id = auth.uid() then return false; end if;
  if exists (select 1 from public.invite_redemptions where invitee_id = auth.uid()) then return false; end if;
  if not exists (select 1 from public.family_access where user_id = auth.uid() and status = 'waiting') then return false; end if;

  update public.family_access
     set status = 'approved', approved_at = now(), approved_by = 'invite', invited_by = inv.inviter_id,
         founding_number = coalesce(founding_number, public.next_founding_number())
   where user_id = auth.uid();
  insert into public.invite_redemptions (code, invitee_id, bonus_month)
  values (inv.code, auth.uid(), date_trunc('month', now())::date);
  return true;
end $$;

-- Only signed-in families may call these; nobody calls the helpers directly.
revoke all on function public.handle_new_family() from public, anon, authenticated;
revoke all on function public.next_founding_number() from public, anon, authenticated;
revoke all on function public.claim_auto_approval() from public, anon;
revoke all on function public.my_invite_code() from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.claim_auto_approval() to authenticated;
grant execute on function public.my_invite_code() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
