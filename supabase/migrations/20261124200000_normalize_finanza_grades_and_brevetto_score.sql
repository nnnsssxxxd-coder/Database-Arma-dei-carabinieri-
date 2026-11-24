-- Normalize the Guardia di Finanza ladder to its 24 official grades.
-- "Allievo Finanziere" is a training status, not a grade; remove it from the grade index.
update public.profile_memberships
set initial_rank=initial_rank-1
where service_branch='finanza' and initial_rank>0;

update public.profiles
set initial_rank=initial_rank-1,updated_at=now()
where service_branch='finanza' and initial_rank>0;

update public.progress
set payload=jsonb_set(payload,'{rank}',to_jsonb(greatest(0,(payload->>'rank')::integer-1)),true),
    updated_at=now()
where service_branch='finanza'
  and payload ? 'rank'
  and (payload->>'rank') ~ '^[0-9]+$'
  and (payload->>'rank')::integer>0;

-- Keep the eight-question brevetto result range aligned with its quiz.
do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.department_vehicle_brevetto_attempts'::regclass
    and conname='department_vehicle_brevetto_attempts_score_check'
    and pg_get_constraintdef(oid) like '%<= 8%'
 ) then
  alter table public.department_vehicle_brevetto_attempts
   drop constraint if exists department_vehicle_brevetto_attempts_score_check;
  alter table public.department_vehicle_brevetto_attempts
   add constraint department_vehicle_brevetto_attempts_score_check
   check (score is null or (score>=0 and score<=8));
 end if;
end $$;
