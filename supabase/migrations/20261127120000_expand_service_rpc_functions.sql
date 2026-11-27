-- Update SECURITY DEFINER progression RPCs to use the six isolated service branches.
-- Existing signatures, ownership checks, row locks, and completion semantics are preserved.
begin;

create or replace function public.complete_rank_exam(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
 a public.rank_exam_attempts%rowtype;
 v_idx integer:=0;
 v_qid uuid;
 v_score integer:=0;
 v_key integer;
 v_payload jsonb;
 v_rank integer;
 v_exp integer;
 v_need integer;
 v_pass boolean;
 v_correct jsonb;
 v_initial integer;
 v_max_rank integer;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>5 then
  raise exception 'Risposte non valide' using errcode='22023';
 end if;
 select * into a from public.rank_exam_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Esame non trovato' using errcode='P0002'; end if;
 if a.completed_at is not null then raise exception 'Esame già consegnato' using errcode='23505'; end if;
 if a.started_at<now()-interval '20 minutes' then raise exception 'Esame scaduto' using errcode='22023'; end if;

 v_max_rank:=case a.service_branch
  when 'carabinieri' then 23
  when 'finanza' then 23
  when 'polizia' then 23
  when 'esercito' then 25
  when 'marina' then 27
  when 'aeronautica' then 25
  else null
 end;
 if v_max_rank is null then raise exception 'Corpo non valido per l''esame' using errcode='22023'; end if;

 select m.initial_rank into v_initial
  from public.profile_memberships m
  join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id
    and m.service_branch=a.service_branch
    and m.active=true
    and p.active=true
    and p.deleted=false;
 if not found then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;

 select payload into v_payload from public.progress
  where user_id=p_user_id and service_branch=a.service_branch for update;
 v_payload:=coalesce(v_payload,'{}'::jsonb);
 v_rank:=greatest(coalesce((v_payload->>'rank')::integer,0),v_initial);
 v_exp:=greatest(0,coalesce((v_payload->>'exp')::integer,0));
 if v_rank>=v_max_rank then
  raise exception 'Hai già raggiunto il grado massimo previsto per il Corpo.' using errcode='22023';
 end if;
 if v_rank<>a.from_rank then raise exception 'Il livello è cambiato: riapri l’esame' using errcode='22023'; end if;
 v_need:=round((250+v_rank*60+v_rank*v_rank*4)/10.0)*10;
 if v_exp<v_need then raise exception 'Non hai ancora raggiunto i requisiti EXP' using errcode='22023'; end if;

 foreach v_qid in array a.question_ids loop
  if jsonb_typeof(p_answers->v_idx)<>'number' or (p_answers->>v_idx)::integer not between 0 and 3 then
   raise exception 'Risposta non valida' using errcode='22023';
  end if;
  select correct_index into v_key from public.quiz_questions
   where id=v_qid and active and service_branch=a.service_branch;
  if not found then raise exception 'Domanda non disponibile' using errcode='P0002'; end if;
  if (p_answers->>v_idx)::integer=v_key then v_score:=v_score+1; end if;
  v_idx:=v_idx+1;
 end loop;

 v_pass:=v_score>=4;
 if v_pass then
  update public.profile_memberships set initial_rank=v_rank+1,updated_at=now()
   where user_id=p_user_id and service_branch=a.service_branch and active=true;
  if not found then raise exception 'Appartenenza al Corpo non attiva' using errcode='42501'; end if;
  v_payload:=jsonb_set(jsonb_set(v_payload,'{rank}',to_jsonb(v_rank+1),true),'{exp}',to_jsonb(0),true);
 end if;
 insert into public.progress(user_id,service_branch,payload,updated_at)
  values(p_user_id,a.service_branch,v_payload,now())
  on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=excluded.updated_at;
 update public.rank_exam_attempts set score=v_score,completed_at=now() where id=p_attempt_id;
 select jsonb_agg(q.correct_index order by x.ord) into v_correct
  from unnest(a.question_ids) with ordinality x(id,ord)
  join public.quiz_questions q on q.id=x.id and q.service_branch=a.service_branch;
 return jsonb_build_object('score',v_score,'total',5,'passed',v_pass,
  'new_rank',case when v_pass then v_rank+1 else v_rank end,
  'progress',v_payload,'correct_answers',v_correct,'service_branch',a.service_branch);
end;
$function$;

create or replace function public.complete_game_mission(p_user_id uuid, p_mission_id text, p_service_branch text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 v_reward integer;
 v_rank integer;
 v_payload jsonb;
 v_inserted uuid;
 v_initial integer;
begin
 if p_service_branch not in ('carabinieri','finanza','polizia','esercito','marina','aeronautica') then
  raise exception 'Corpo non valido';
 end if;
 v_reward:=case p_mission_id
  when 'academy_orientation' then 15
  when 'community_assistance' then 25
  when 'missing_person' then 35
  when 'safe_patrol' then 20
  else null
 end;
 if v_reward is null then raise exception 'Missione non valida'; end if;
 select m.initial_rank into v_initial from public.profile_memberships m
 join public.profiles p on p.id=m.user_id
 where m.user_id=p_user_id and m.service_branch=p_service_branch and m.active=true and p.active and not p.deleted
 for update of p;
 if not found then raise exception 'Profilo non abilitato per il Corpo'; end if;
 insert into public.game_mission_completions(user_id,service_branch,mission_id,exp_awarded)
 values(p_user_id,p_service_branch,p_mission_id,v_reward)
 on conflict do nothing returning id into v_inserted;
 if v_inserted is null then return jsonb_build_object('completed',false,'duplicate',true,'exp_awarded',0); end if;
 select payload into v_payload from public.progress where user_id=p_user_id and service_branch=p_service_branch for update;
 v_payload:=coalesce(v_payload,jsonb_build_object('rank',v_initial,'exp',0,'totalExp',0));
 v_rank:=greatest(coalesce((v_payload->>'rank')::integer,0),v_initial);
 v_payload:=jsonb_set(jsonb_set(jsonb_set(v_payload,'{rank}',to_jsonb(v_rank),true),'{exp}',to_jsonb(greatest(0,coalesce((v_payload->>'exp')::integer,0))+v_reward),true),'{totalExp}',to_jsonb(greatest(0,coalesce((v_payload->>'totalExp')::integer,0))+v_reward),true);
 insert into public.progress(user_id,service_branch,payload,updated_at) values(p_user_id,p_service_branch,v_payload,now())
 on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 return jsonb_build_object('completed',true,'duplicate',false,'exp_awarded',v_reward,'progress',v_payload,'service_branch',p_service_branch);
end;
$function$;

commit;
