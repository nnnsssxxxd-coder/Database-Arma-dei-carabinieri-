-- Align the submit RPC with the Appuntato threshold for both bodies.
create or replace function public.complete_vehicle_brevetto_attempt(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
 v_attempt public.department_vehicle_brevetto_attempts%rowtype;
 v_progress public.progress%rowtype;
 v_initial integer; v_rank integer; v_score integer:=0; v_award integer;
 v_exp integer; v_total integer; v_need integer; v_streak integer;
 v_correct jsonb; v_history jsonb; v_payload jsonb;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>8 then
  raise exception 'Risposte non valide' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then
  raise exception 'Risposte non valide' using errcode='22023';
 end if;
 select * into v_attempt from public.department_vehicle_brevetto_attempts
 where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione brevetto non trovata' using errcode='P0002'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz Brevetto già consegnato' using errcode='23505'; end if;
 if v_attempt.started_at<now()-interval '10 minutes' then raise exception 'Sessione brevetto scaduta' using errcode='22023'; end if;
 if not exists(select 1 from public.profile_memberships m join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id and m.service_branch=v_attempt.service_branch and m.active=true and p.active and not p.deleted) then
  raise exception 'Account non abilitato per il Corpo' using errcode='42501';
 end if;
 select initial_rank into v_initial from public.profile_memberships
 where user_id=p_user_id and service_branch=v_attempt.service_branch and active=true;
 select * into v_progress from public.progress where user_id=p_user_id and service_branch=v_attempt.service_branch for update;
 v_payload:=coalesce(v_progress.payload,'{}'::jsonb);
 v_rank:=greatest(coalesce((v_payload->>'rank')::integer,0),coalesce(v_initial,0));
 if v_rank < 2 then raise exception 'Il Quiz Brevetto si sblocca dal grado di Appuntato' using errcode='42501'; end if;
 if not exists(select 1 from public.department_vehicle_brevetti b
  where b.user_id=p_user_id and b.service_branch=v_attempt.service_branch and b.vehicle_id=v_attempt.vehicle_id) then
  raise exception 'Brevetto selezionato non valido' using errcode='42501';
 end if;
 select coalesce(jsonb_agg((q->>5)::integer order by ord),'[]'::jsonb)
 into v_correct from jsonb_array_elements(v_attempt.questions) with ordinality as x(q,ord);
 if jsonb_array_length(v_correct)<>8 then raise exception 'Domande brevetto non valide'; end if;
 select count(*) into v_score from generate_series(0,7) i
 where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_award:=20+v_score*6+case when v_score=8 then 10 else 0 end;
 v_need:=round((250+v_rank*60+v_rank*v_rank*4)/10.0)*10;
 v_exp:=least(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_award,v_need);
 v_total:=coalesce((v_payload->>'totalExp')::integer,0)+v_award;
 v_streak:=case when v_score=8 then coalesce((v_payload->>'streak')::integer,0)+1 else 0 end;
 v_history:=coalesce(v_payload->'history','[]'::jsonb)||jsonb_build_array(
  jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','vehicle_brevetto','vehicle_id',v_attempt.vehicle_id));
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into v_history
 from (select value,ord from jsonb_array_elements(v_history) with ordinality e(value,ord) order by ord desc limit 20) x;
 v_payload:=jsonb_build_object('rank',v_rank,'exp',v_exp,'totalExp',v_total,
  'quizCount',coalesce((v_payload->>'quizCount')::integer,0)+1,
  'correct',coalesce((v_payload->>'correct')::integer,0)+v_score,'streak',v_streak,'history',v_history);
 insert into public.progress(user_id,service_branch,payload,updated_at)
 values(p_user_id,v_attempt.service_branch,v_payload,now())
 on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 update public.department_vehicle_brevetto_attempts
 set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now()
 where id=p_attempt_id and user_id=p_user_id;
 return jsonb_build_object('score',v_score,'total',8,'passed',v_score>=6,
  'exp_awarded',v_award,'progress',v_payload,'correct_answers',v_correct);
end;
$function$;
revoke all on function public.complete_vehicle_brevetto_attempt(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_vehicle_brevetto_attempt(uuid,uuid,jsonb) to service_role;

