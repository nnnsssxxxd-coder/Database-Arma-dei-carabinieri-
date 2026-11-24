create or replace function public.start_vehicle_brevetto_attempt(p_user_id uuid,p_service_branch text,p_vehicle_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_cycle public.vehicle_brevetto_cycles%rowtype;
 v_open public.department_vehicle_brevetto_attempts%rowtype;
 v_selected public.department_vehicle_brevetti%rowtype;
 v_ids uuid[]; v_questions jsonb; v_attempt public.department_vehicle_brevetto_attempts%rowtype;
 v_initial integer; v_rank integer;
begin
 if p_user_id is null or p_service_branch not in ('carabinieri','finanza') or p_vehicle_id is null then
  return jsonb_build_object('error','Richiesta brevetto non valida.');
 end if;
 if not exists(select 1 from public.profile_memberships m join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id and m.service_branch=p_service_branch and m.active=true and p.active=true and p.deleted=false) then
  return jsonb_build_object('error','Account non abilitato per questo Corpo.');
 end if;
 select * into v_selected from public.department_vehicle_brevetti
  where user_id=p_user_id and service_branch=p_service_branch and vehicle_id=p_vehicle_id;
 if not found then return jsonb_build_object('error','Brevetto selezionato non valido.'); end if;
 select initial_rank into v_initial from public.profile_memberships
  where user_id=p_user_id and service_branch=p_service_branch and active=true;
 select greatest(coalesce((payload->>'rank')::integer,0),coalesce(v_initial,0)) into v_rank
  from public.progress where user_id=p_user_id and service_branch=p_service_branch;
 v_rank:=coalesce(v_rank,v_initial,0);
 if v_rank < 2 then
  return jsonb_build_object('error','Il Quiz Brevetto non è ancora sbloccato.');
 end if;
 insert into public.vehicle_brevetto_cycles(user_id,service_branch,vehicle_id)
 values(p_user_id,p_service_branch,p_vehicle_id) on conflict(user_id,service_branch) do nothing;
 select * into v_cycle from public.vehicle_brevetto_cycles
  where user_id=p_user_id and service_branch=p_service_branch for update;
 if v_cycle.vehicle_id <> p_vehicle_id then
  return jsonb_build_object('error','Il veicolo selezionato non corrisponde al ciclo brevetto.');
 end if;
 if v_cycle.cooldown_until is not null and v_cycle.cooldown_until > now() then
  return jsonb_build_object('error','Hai completato le 6 prove. Il ripristino sarà disponibile tra 12 ore.',
   'cooldown_until',v_cycle.cooldown_until,'attempts_completed',6,'attempts_remaining',0);
 end if;
 if v_cycle.cooldown_until is not null and v_cycle.cooldown_until <= now() then
  update public.vehicle_brevetto_cycles set cycle_number=cycle_number+1,completed_attempts=0,
   used_question_ids='{}'::uuid[],cooldown_until=null,updated_at=now()
   where user_id=p_user_id and service_branch=p_service_branch returning * into v_cycle;
 elsif v_cycle.completed_attempts >= 6 then
  update public.vehicle_brevetto_cycles set cooldown_until=now()+interval '12 hours',updated_at=now()
   where user_id=p_user_id and service_branch=p_service_branch returning * into v_cycle;
  return jsonb_build_object('error','Hai completato le 6 prove. Il ripristino sarà disponibile tra 12 ore.',
   'cooldown_until',v_cycle.cooldown_until,'attempts_completed',6,'attempts_remaining',0);
 end if;
 select * into v_open from public.department_vehicle_brevetto_attempts
  where user_id=p_user_id and service_branch=p_service_branch and completed_at is null
  order by started_at desc limit 1;
 if found and v_open.started_at >= now()-interval '10 minutes' then
  return jsonb_build_object('attempt_id',v_open.id,'questions',v_open.questions,
   'expires_at',v_open.started_at+interval '10 minutes','resumed',true,
   'attempts_completed',v_cycle.completed_attempts,'attempts_remaining',6-v_cycle.completed_attempts,
   'cycle_number',v_cycle.cycle_number);
 elsif found then
  update public.department_vehicle_brevetto_attempts set completed_at=now()
   where id=v_open.id and completed_at is null;
 end if;
 with picked as (
  select id,prompt,options,correct_index,explanation,source_url
  from public.vehicle_brevetto_question_bank
  where vehicle_id=p_vehicle_id and active=true
   and not (id=any(coalesce(v_cycle.used_question_ids,'{}'::uuid[])))
  order by random() limit 8
 ), ordered as (
  select *,row_number() over () as ord from picked
 )
 select array_agg(id order by ord),
  jsonb_agg(jsonb_build_array(prompt)||options||jsonb_build_array(correct_index,explanation,source_url) order by ord)
 into v_ids,v_questions from ordered;
 if coalesce(array_length(v_ids,1),0)<>8 then
  return jsonb_build_object('error','Domande nuove insufficienti per questa sessione. Contatta l’amministratore.',
   'available',coalesce(array_length(v_ids,1),0));
 end if;
 insert into public.department_vehicle_brevetto_attempts(user_id,service_branch,department_id,vehicle_id,questions,question_ids)
 values(p_user_id,p_service_branch,null,p_vehicle_id,v_questions,v_ids) returning * into v_attempt;
 return jsonb_build_object('attempt_id',v_attempt.id,'questions',v_questions,
  'expires_at',v_attempt.started_at+interval '10 minutes','resumed',false,
  'attempts_completed',v_cycle.completed_attempts,'attempts_remaining',6-v_cycle.completed_attempts,
  'cycle_number',v_cycle.cycle_number);
end;
$$;
revoke all on function public.start_vehicle_brevetto_attempt(uuid,text,text) from public,anon,authenticated;
grant execute on function public.start_vehicle_brevetto_attempt(uuid,text,text) to service_role;
