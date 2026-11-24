-- Fix the NULL-sensitive vehicle ownership check in brevetto submission.
-- Standalone brevetto selections intentionally have department_id = NULL.
do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.complete_vehicle_brevetto_attempt(uuid,uuid,jsonb)'::regprocedure)
    into v_definition;

  if position('b.department_id=v_attempt.department_id' in v_definition) = 0 then
    raise exception 'Expected NULL-sensitive vehicle ownership check was not found; migration stopped safely.';
  end if;

  v_definition := replace(v_definition, ' and b.department_id=v_attempt.department_id', '');
  v_definition := replace(
    v_definition,
    'if v_rank < (case when v_attempt.service_branch=''finanza'' then 3 else 2 end) then',
    'if v_rank < 2 then'
  );

  if position('b.department_id=v_attempt.department_id' in v_definition) > 0 then
    raise exception 'Vehicle ownership check replacement failed.';
  end if;

  execute v_definition;
end
$migration$;

-- Award 10 EXP for every completed patrol, regardless of the decision outcome.
-- Row locking and completed_at keep retries from granting EXP twice.
create or replace function public.finish_traffic_control_session(
  p_session_id uuid,
  p_user_id uuid,
  p_service_branch text,
  p_chosen_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.traffic_control_sessions%rowtype;
  v_profile public.profiles%rowtype;
  v_initial integer;
  v_payload jsonb;
  v_reward integer := 10;
  v_correct boolean := false;
begin
  if p_service_branch not in ('carabinieri','finanza') then
    raise exception 'Corpo non valido';
  end if;
  if p_chosen_action not in ('sanzione','avviso','nessuna_violazione') then
    raise exception 'Decisione non valida';
  end if;

  select * into v_session
  from public.traffic_control_sessions
  where id=p_session_id and user_id=p_user_id and service_branch=p_service_branch
  for update;

  if not found then
    raise exception 'Sessione di controllo non trovata';
  end if;

  if v_session.completed_at is not null then
    return jsonb_build_object(
      'completed',false,'duplicate',true,'exp_awarded',0,
      'correct',coalesce(v_session.is_correct,false)
    );
  end if;

  if v_session.expires_at < now() then
    update public.traffic_control_sessions
    set completed_at=now(),chosen_action=p_chosen_action,is_correct=false,exp_awarded=0
    where id=p_session_id;
    return jsonb_build_object('completed',false,'expired',true,'exp_awarded',0,'correct',false);
  end if;

  select * into v_profile
  from public.profiles
  where id=p_user_id and active=true and not deleted
  for update;
  if not found then raise exception 'Profilo non attivo'; end if;

  select initial_rank into v_initial
  from public.profile_memberships
  where user_id=p_user_id and service_branch=p_service_branch and active=true;
  if not found then raise exception 'Profilo non abilitato per il Corpo'; end if;

  v_correct := p_chosen_action = v_session.correct_action;

  update public.traffic_control_sessions
  set completed_at=now(),chosen_action=p_chosen_action,is_correct=v_correct,exp_awarded=v_reward
  where id=p_session_id;

  select payload into v_payload
  from public.progress
  where user_id=p_user_id and service_branch=p_service_branch
  for update;

  v_payload := coalesce(v_payload,jsonb_build_object('rank',v_initial,'exp',0,'totalExp',0));
  v_payload := jsonb_set(v_payload,'{rank}',to_jsonb(greatest(coalesce((v_payload->>'rank')::integer,0),v_initial)),true);
  v_payload := jsonb_set(v_payload,'{exp}',to_jsonb(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_reward),true);
  v_payload := jsonb_set(v_payload,'{totalExp}',to_jsonb(greatest(0,coalesce((v_payload->>'totalExp')::integer,0))+v_reward),true);

  insert into public.progress(user_id,service_branch,payload,updated_at)
  values(p_user_id,p_service_branch,v_payload,now())
  on conflict(user_id,service_branch)
  do update set payload=excluded.payload,updated_at=now();

  return jsonb_build_object(
    'completed',true,'duplicate',false,'correct',v_correct,
    'exp_awarded',v_reward,'correct_action',v_session.correct_action,
    'progress',v_payload
  );
end;
$function$;

revoke all on function public.finish_traffic_control_session(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_traffic_control_session(uuid,uuid,text,text) to service_role;
