-- Count only submitted, scored brevetto quizzes toward the six-quiz cycle.
-- Timed-out or abandoned sessions do not consume one of the six completed quizzes.
create or replace function public.track_vehicle_brevetto_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.completed_at is null
     and new.completed_at is not null
     and new.score is not null then
    update public.vehicle_brevetto_cycles
    set completed_attempts = least(6, completed_attempts + 1),
        used_question_ids = array(
          select distinct qid
          from unnest(
            coalesce(used_question_ids, '{}'::uuid[]) ||
            coalesce(new.question_ids, '{}'::uuid[])
          ) as qid
        ),
        cooldown_until = case
          when completed_attempts + 1 >= 6 then now() + interval '12 hours'
          else null
        end,
        updated_at = now()
    where user_id = new.user_id
      and service_branch = new.service_branch;
  end if;
  return new;
end;
$$;

revoke all on function public.track_vehicle_brevetto_completion()
  from public, anon, authenticated;

-- Repair counters created by the previous trigger. Use the question IDs
-- already attached to the current cycle, so attempts from older cycles are
-- not counted again after a cooldown reset.
update public.vehicle_brevetto_cycles c
set completed_attempts = least(6, (
      select count(distinct a.id)::integer
      from public.department_vehicle_brevetto_attempts a
      where a.user_id = c.user_id
        and a.service_branch = c.service_branch
        and a.completed_at is not null
        and a.score is not null
        and a.question_ids && coalesce(c.used_question_ids, '{}'::uuid[])
    )),
    cooldown_until = case
      when (
        select count(distinct a.id)
        from public.department_vehicle_brevetto_attempts a
        where a.user_id = c.user_id
          and a.service_branch = c.service_branch
          and a.completed_at is not null
          and a.score is not null
          and a.question_ids && coalesce(c.used_question_ids, '{}'::uuid[])
      ) >= 6 then coalesce(c.cooldown_until, now() + interval '12 hours')
      else null
    end,
    updated_at = now();
