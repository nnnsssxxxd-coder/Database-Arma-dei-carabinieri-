create table if not exists public.traffic_control_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_branch text not null check (service_branch in ('carabinieri','finanza')),
  scenario_id text not null,
  correct_action text not null check (correct_action in ('sanzione','avviso','nessuna_violazione')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  completed_at timestamptz,
  chosen_action text,
  is_correct boolean,
  exp_awarded integer not null default 0 check (exp_awarded >= 0),
  constraint traffic_chosen_action_check check (chosen_action is null or chosen_action in ('sanzione','avviso','nessuna_violazione'))
);
create index if not exists traffic_control_sessions_user_idx on public.traffic_control_sessions(user_id, service_branch, started_at desc);
create unique index if not exists traffic_control_one_open_session on public.traffic_control_sessions(user_id, service_branch) where completed_at is null;
alter table public.traffic_control_sessions enable row level security;
revoke all on public.traffic_control_sessions from anon, authenticated, public;
create or replace function public.finish_traffic_control_session(p_session_id uuid,p_user_id uuid,p_service_branch text,p_chosen_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_session public.traffic_control_sessions%rowtype; v_profile public.profiles%rowtype; v_initial integer; v_payload jsonb; v_reward integer:=0; v_correct boolean:=false;
begin
 if p_service_branch not in ('carabinieri','finanza') then raise exception 'Corpo non valido'; end if;
 if p_chosen_action not in ('sanzione','avviso','nessuna_violazione') then raise exception 'Decisione non valida'; end if;
 select * into v_session from public.traffic_control_sessions where id=p_session_id and user_id=p_user_id and service_branch=p_service_branch for update;
 if not found then raise exception 'Sessione di controllo non trovata'; end if;
 if v_session.completed_at is not null then return jsonb_build_object('completed',false,'duplicate',true,'exp_awarded',0,'correct',coalesce(v_session.is_correct,false)); end if;
 if v_session.expires_at<now() then update public.traffic_control_sessions set completed_at=now(),chosen_action=p_chosen_action,is_correct=false,exp_awarded=0 where id=p_session_id; return jsonb_build_object('completed',false,'expired',true,'exp_awarded',0,'correct',false); end if;
 select * into v_profile from public.profiles where id=p_user_id and active=true and not deleted for update;
 if not found then raise exception 'Profilo non attivo'; end if;
 select initial_rank into v_initial from public.profile_memberships where user_id=p_user_id and service_branch=p_service_branch and active=true;
 if not found then raise exception 'Profilo non abilitato per il Corpo'; end if;
 v_correct:=p_chosen_action=v_session.correct_action; if v_correct then v_reward:=18; end if;
 update public.traffic_control_sessions set completed_at=now(),chosen_action=p_chosen_action,is_correct=v_correct,exp_awarded=v_reward where id=p_session_id;
 if v_reward>0 then
  select payload into v_payload from public.progress where user_id=p_user_id and service_branch=p_service_branch for update;
  v_payload:=coalesce(v_payload,jsonb_build_object('rank',v_initial,'exp',0,'totalExp',0));
  v_payload:=jsonb_set(jsonb_set(jsonb_set(v_payload,'{rank}',to_jsonb(greatest(coalesce((v_payload->>'rank')::integer,0),v_initial)),true),'{exp}',to_jsonb(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_reward),true),'{totalExp}',to_jsonb(greatest(0,coalesce((v_payload->>'totalExp')::integer,0))+v_reward),true);
  insert into public.progress(user_id,service_branch,payload,updated_at) values(p_user_id,p_service_branch,v_payload,now()) on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 end if;
 return jsonb_build_object('completed',true,'duplicate',false,'correct',v_correct,'exp_awarded',v_reward,'correct_action',v_session.correct_action);
end; $$;
revoke all on function public.finish_traffic_control_session(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_traffic_control_session(uuid,uuid,text,text) to service_role;
