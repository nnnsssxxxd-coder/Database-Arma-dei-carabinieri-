-- Expand service_branch support without changing existing user records.
-- This is intentionally additive: no profiles, progress, memberships, attempts or
-- authentication records are rewritten or deleted by this migration.

begin;

do $$
declare
  item record;
begin
  for item in
    select c.conrelid::regclass as table_name, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.connamespace = 'public'::regnamespace
      and pg_get_constraintdef(c.oid) ilike '%service_branch%'
      and pg_get_constraintdef(c.oid) ilike '%carabinieri%'
      and pg_get_constraintdef(c.oid) ilike '%finanza%'
  loop
    execute format('alter table %s drop constraint %I', item.table_name, item.conname);
    execute format(
      'alter table %s add constraint %I check (service_branch in (''carabinieri'', ''finanza'', ''polizia'', ''esercito'', ''marina'', ''aeronautica'')) not valid',
      item.table_name,
      item.conname
    );
    execute format('alter table %s validate constraint %I', item.table_name, item.conname);
  end loop;
end
$$;

-- Preserve existing CC-/GF- matricole and allow a distinct prefix for each new body.
alter table public.profiles
  drop constraint if exists profiles_matricola_format;

alter table public.profiles
  add constraint profiles_matricola_format
  check (
    matricola is null
    or matricola ~ '^(CC|GF|PS|EI|MM|AM)-[0-9]{7}$'
  ) not valid;

alter table public.profiles
  validate constraint profiles_matricola_format;

-- The longest official rank ladders in the new environments contain 28 entries.
-- Increase only the permitted index range; existing rank values are untouched.
alter table public.profiles
  drop constraint if exists profiles_initial_rank_check;
alter table public.profiles
  add constraint profiles_initial_rank_check
  check (initial_rank >= 0 and initial_rank <= 27) not valid;
alter table public.profiles
  validate constraint profiles_initial_rank_check;

alter table public.profile_memberships
  drop constraint if exists profile_memberships_initial_rank_check;
alter table public.profile_memberships
  add constraint profile_memberships_initial_rank_check
  check (initial_rank >= 0 and initial_rank <= 27) not valid;
alter table public.profile_memberships
  validate constraint profile_memberships_initial_rank_check;

comment on column public.profiles.service_branch is
  'Isolated service environment: carabinieri, finanza, polizia, esercito, marina, aeronautica.';

commit;
