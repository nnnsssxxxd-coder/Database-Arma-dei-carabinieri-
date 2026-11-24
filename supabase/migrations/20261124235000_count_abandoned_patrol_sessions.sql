-- A patrol session consumes one of the ten daily scenarios even if it is
-- abandoned and closed by the next start. This prevents unlimited retries by
-- repeatedly closing an unfinished session.
create or replace function public.track_traffic_control_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    insert into public.traffic_control_cycles(
      user_id,service_branch,completed_count,used_scenario_ids
    )
    values(
      new.user_id,new.service_branch,1,array[new.scenario_id]
    )
    on conflict(user_id,service_branch) do update
      set completed_count=least(10,public.traffic_control_cycles.completed_count+1),
          used_scenario_ids=(
            select array(
              select distinct x
              from unnest(
                public.traffic_control_cycles.used_scenario_ids || array[new.scenario_id]
              ) x
            )
          ),
          cooldown_until=case
            when public.traffic_control_cycles.completed_count+1>=10
              then now()+interval '24 hours'
            else null
          end,
          updated_at=now();
  end if;
  return new;
end;
$$;
revoke all on function public.track_traffic_control_completion()
  from public,anon,authenticated;
