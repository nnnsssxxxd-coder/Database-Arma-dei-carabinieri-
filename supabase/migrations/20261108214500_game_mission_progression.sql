create table if not exists public.game_mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null check (mission_id in ('academy_orientation','community_assistance','missing_person','safe_patrol')),
  exp_awarded integer not null check (exp_awarded > 0 and exp_awarded <= 50),
  completed_at timestamptz not null default now(),
  unique (user_id, mission_id)
);
alter table public.game_mission_completions enable row level security;
revoke all on public.game_mission_completions from anon, authenticated;
grant all on public.game_mission_completions to service_role;
create or replace function public.complete_game_mission(p_user_id uuid, p_mission_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_reward integer; v_rank integer; v_payload jsonb; v_inserted uuid;
begin
  v_reward := case p_mission_id when 'academy_orientation' then 15 when 'community_assistance' then 25 when 'missing_person' then 35 when 'safe_patrol' then 20 else null end;
  if v_reward is null then raise exception 'Missione non valida'; end if;
  select greatest(coalesce((pr.payload->>'rank')::integer,0),p.initial_rank),coalesce(pr.payload,'{}'::jsonb)
    into v_rank,v_payload from public.profiles p left join public.progress pr on pr.user_id=p.id
   where p.id=p_user_id and p.active=true and p.deleted=false for update of p;
  if not found then raise exception 'Profilo non attivo'; end if;
  insert into public.game_mission_completions(user_id,mission_id,exp_awarded) values(p_user_id,p_mission_id,v_reward)
  on conflict(user_id,mission_id) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('completed',false,'duplicate',true,'exp_awarded',0); end if;
  v_payload:=jsonb_set(jsonb_set(jsonb_set(v_payload,'{rank}',to_jsonb(v_rank),true),'{exp}',to_jsonb(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_reward),true),'{totalExp}',to_jsonb(greatest(0,coalesce((v_payload->>'totalExp')::integer,0))+v_reward),true);
  insert into public.progress(user_id,payload,updated_at) values(p_user_id,v_payload,now())
  on conflict(user_id) do update set payload=excluded.payload,updated_at=now();
  return jsonb_build_object('completed',true,'duplicate',false,'exp_awarded',v_reward,'progress',v_payload);
end; $$;
revoke all on function public.complete_game_mission(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_game_mission(uuid,text) to service_role;
