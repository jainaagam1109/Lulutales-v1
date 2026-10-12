-- LuluTales: family emails (thank-you on sign-up, you're-in on approval) and automatic approval.
-- Emails stay PAUSED (emails_enabled = false) until launch; only the test list receives them meanwhile.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.app_settings add column if not exists emails_enabled boolean not null default false;
alter table public.app_settings add column if not exists email_test_recipients text[] not null
  default array['aagam@lulutales.in','aagam_jain2022@pgp.isb.edu','mylulutales@gmail.com','hello@lulutales.in','jainaagam1109@gmail.com'];

-- Private settings only the server can read (no policies = no access for the app).
create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Queue of emails to send. One of each kind per family, ever.
create table if not exists public.email_outbox (
  id bigserial primary key,
  user_id uuid not null,
  kind text not null check (kind in ('welcome','approved')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  unique (user_id, kind)
);
alter table public.email_outbox enable row level security;
drop policy if exists "Admins read outbox" on public.email_outbox;
create policy "Admins read outbox" on public.email_outbox for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.email_outbox from anon, authenticated;

-- New sign-up: waiting record + thank-you email.
create or replace function public.handle_new_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.family_access (user_id, status, signed_up_at, auto_approve_at)
  select new.id, 'waiting', now(), now() + make_interval(hours => coalesce(s.auto_approve_hours, 48))
  from (select auto_approve_hours from public.app_settings limit 1) s
  on conflict (user_id) do nothing;
  insert into public.email_outbox (user_id, kind) values (new.id, 'welcome') on conflict do nothing;
  return new;
exception when others then
  raise warning 'handle_new_family failed for %: %', new.id, sqlerrm;
  return new;
end $$;

-- Waiting -> approved (by admin, invite or automatically): you're-in email.
create or replace function public.queue_approved_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'waiting' and new.status = 'approved' then
    insert into public.email_outbox (user_id, kind) values (new.user_id, 'approved') on conflict do nothing;
  end if;
  return new;
exception when others then
  raise warning 'queue_approved_email failed for %: %', new.user_id, sqlerrm;
  return new;
end $$;
drop trigger if exists on_family_approved_email on public.family_access;
create trigger on_family_approved_email after update of status on public.family_access
  for each row execute function public.queue_approved_email();

-- Approve every family whose waiting time is over (runs every minute).
create or replace function public.auto_approve_due()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not coalesce((select auto_approve_enabled from public.app_settings limit 1), false) then return 0; end if;
  for r in select user_id from public.family_access where status = 'waiting' and auto_approve_at <= now() order by auto_approve_at loop
    update public.family_access
       set status = 'approved', approved_at = now(), approved_by = 'auto',
           founding_number = coalesce(founding_number, public.next_founding_number())
     where user_id = r.user_id and status = 'waiting';
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.queue_approved_email() from public, anon, authenticated;
revoke all on function public.auto_approve_due() from public, anon, authenticated;

-- Private key the scheduled job uses to call the email sender.
insert into public.app_secrets (name, value) values ('outbox_key', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

-- Every minute: approve due families, then send any queued emails.
select cron.unschedule('lulutales-approvals-and-emails') where exists (select 1 from cron.job where jobname = 'lulutales-approvals-and-emails');
select cron.schedule('lulutales-approvals-and-emails', '* * * * *', $job$
  select public.auto_approve_due();
  select net.http_post(
    url := 'https://lidbfkytoajumnhwlcry.supabase.co/functions/v1/send-family-emails',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'x-outbox-key', (select value from public.app_secrets where name = 'outbox_key')),
    body := '{}'::jsonb)
  where exists (select 1 from public.email_outbox where sent_at is null and attempts < 5);
$job$);
