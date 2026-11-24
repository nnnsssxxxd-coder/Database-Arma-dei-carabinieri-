-- Vehicle brevetto now has eight answers and awards EXP to normal body progression only.
create or replace function public.complete_vehicle_brevetto_attempt(p_user_id uuid,p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare v_attempt public.department_vehicle_brevetto_attempts%rowtype; v_progress public.progress%rowtype; v_initial integer; v_rank integer; v_score integer:=0; v_award integer; v_exp integer; v_total integer; v_need integer; v_streak integer; v_correct jsonb; v_history jsonb; v_payload jsonb;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>8 then raise exception 'Risposte non valide' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide' using errcode='22023'; end if;
 select * into v_attempt from public.department_vehicle_brevetto_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione brevetto non trovata' using errcode='P0002'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz Brevetto già consegnato' using errcode='23505'; end if;
 if v_attempt.started_at<now()-interval '10 minutes' then raise exception 'Sessione brevetto scaduta' using errcode='22023'; end if;
 if not exists(select 1 from public.profile_memberships m join public.profiles p on p.id=m.user_id where m.user_id=p_user_id and m.service_branch=v_attempt.service_branch and m.active=true and p.active and not p.deleted) then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;
 select initial_rank into v_initial from public.profile_memberships where user_id=p_user_id and service_branch=v_attempt.service_branch and active=true;
 select * into v_progress from public.progress where user_id=p_user_id and service_branch=v_attempt.service_branch for update;
 v_payload:=coalesce(v_progress.payload,'{}'::jsonb);
 v_rank:=greatest(coalesce((v_payload->>'rank')::integer,0),coalesce(v_initial,0));
 if v_rank < (case when v_attempt.service_branch='finanza' then 3 else 2 end) then raise exception 'Il Quiz Brevetto si sblocca dal grado di Appuntato' using errcode='42501'; end if;
 if not exists(select 1 from public.department_vehicle_brevetti b where b.user_id=p_user_id and b.service_branch=v_attempt.service_branch and b.vehicle_id=v_attempt.vehicle_id) then raise exception 'Brevetto selezionato non valido' using errcode='42501'; end if;
 select coalesce(jsonb_agg((q->>5)::integer order by ord),'[]'::jsonb) into v_correct from jsonb_array_elements(v_attempt.questions) with ordinality as x(q,ord);
 if jsonb_array_length(v_correct)<>8 then raise exception 'Domande brevetto non valide'; end if;
 select count(*) into v_score from generate_series(0,7) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_award:=6+v_score*2+case when v_score=8 then 8 else 0 end;
 v_need:=round((250+v_rank*60+v_rank*v_rank*4)/10.0)*10;
 v_exp:=least(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_award,v_need);
 v_total:=coalesce((v_payload->>'totalExp')::integer,0)+v_award;
 v_streak:=case when v_score=8 then coalesce((v_payload->>'streak')::integer,0)+1 else 0 end;
 v_history:=coalesce(v_payload->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','vehicle_brevetto','vehicle_id',v_attempt.vehicle_id));
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into v_history from (select value,ord from jsonb_array_elements(v_history) with ordinality e(value,ord) order by ord desc limit 20) x;
 v_payload:=jsonb_build_object('rank',v_rank,'exp',v_exp,'totalExp',v_total,'quizCount',coalesce((v_payload->>'quizCount')::integer,0)+1,'correct',coalesce((v_payload->>'correct')::integer,0)+v_score,'streak',v_streak,'history',v_history);
 insert into public.progress(user_id,service_branch,payload,updated_at) values(p_user_id,v_attempt.service_branch,v_payload,now()) on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 update public.department_vehicle_brevetto_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now() where id=p_attempt_id and user_id=p_user_id;
 return jsonb_build_object('score',v_score,'total',8,'passed',v_score>=6,'exp_awarded',v_award,'progress',v_payload,'correct_answers',v_correct);
end;
$function$;
revoke all on function public.complete_vehicle_brevetto_attempt(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_vehicle_brevetto_attempt(uuid,uuid,jsonb) to service_role;


-- Patrol rewards: 3 EXP for a correct decision, no reward otherwise.
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
 v_correct:=p_chosen_action=v_session.correct_action; if v_correct then v_reward:=3; end if;
 update public.traffic_control_sessions set completed_at=now(),chosen_action=p_chosen_action,is_correct=v_correct,exp_awarded=v_reward where id=p_session_id;
 if v_reward>0 then
  select payload into v_payload from public.progress where user_id=p_user_id and service_branch=p_service_branch for update;
  v_payload:=coalesce(v_payload,jsonb_build_object('rank',v_initial,'exp',0,'totalExp',0));
  v_payload:=jsonb_set(v_payload,'{rank}',to_jsonb(greatest(coalesce((v_payload->>'rank')::integer,0),v_initial)),true);
  v_payload:=jsonb_set(v_payload,'{exp}',to_jsonb(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_reward),true);
  v_payload:=jsonb_set(v_payload,'{totalExp}',to_jsonb(greatest(0,coalesce((v_payload->>'totalExp')::integer,0))+v_reward),true);
  insert into public.progress(user_id,service_branch,payload,updated_at) values(p_user_id,p_service_branch,v_payload,now()) on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 end if;
 return jsonb_build_object('completed',true,'duplicate',false,'correct',v_correct,'exp_awarded',v_reward,'correct_action',v_session.correct_action);
end; $$;
revoke all on function public.finish_traffic_control_session(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_traffic_control_session(uuid,uuid,text,text) to service_role;
