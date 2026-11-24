-- A profile is globally active only while it has at least one active Corps membership.
-- Preserve historical progress; only reconcile the account's login-enabled flag.
update public.profiles p
set active=false
where p.active=true
  and p.deleted=false
  and not exists(
    select 1 from public.profile_memberships m
    where m.user_id=p.id and m.active=true
  );
