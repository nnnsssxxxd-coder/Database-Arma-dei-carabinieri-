-- Require traceable institutional/legal sources for every general and department-bank question.
-- Existing rows remain nullable during the editorial backfill, but every serving/scoring path fails closed.
begin;

alter table public.quiz_questions
  add column if not exists source_url text,
  add column if not exists source_note text;

alter table public.department_questions
  add column if not exists source_url text,
  add column if not exists source_note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='quiz_questions_source_pair_check' and conrelid='public.quiz_questions'::regclass) then
    alter table public.quiz_questions add constraint quiz_questions_source_pair_check
      check (
        (source_url is null and source_note is null)
        or
        (source_url is not null and source_note is not null
          and source_url ~ '^https://[^[:space:]]+$'
          and length(btrim(source_note)) >= 20)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname='department_questions_source_pair_check' and conrelid='public.department_questions'::regclass) then
    alter table public.department_questions add constraint department_questions_source_pair_check
      check (
        (source_url is null and source_note is null)
        or
        (source_url is not null and source_note is not null
          and source_url ~ '^https://[^[:space:]]+$'
          and length(btrim(source_note)) >= 20)
      );
  end if;
end $$;

comment on column public.quiz_questions.source_url is 'HTTPS institutional or normative source supporting this exact question.';
comment on column public.quiz_questions.source_note is 'Specific citation note explaining which part of the source supports this question.';
comment on column public.department_questions.source_url is 'HTTPS institutional or normative source supporting this exact department question.';
comment on column public.department_questions.source_note is 'Specific citation note explaining which part of the source supports this department question.';

create or replace function public.complete_quiz_attempt(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
 a public.quiz_attempts%rowtype;
 v_score integer:=0;
 v_rank integer;
 v_exp integer;
 v_award integer;
 v_streak integer;
 v_total integer;
 v_old jsonb;
 v_payload jsonb;
 v_idx integer:=0;
 v_qid uuid;
 v_answer integer;
 v_key integer;
 v_history jsonb;
 v_username text;
 v_initial integer;
 v_correct jsonb;
 v_review jsonb;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>4 then
  raise exception 'Risposte non valide' using errcode='22023';
 end if;
 select * into a from public.quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Quiz non trovato' using errcode='P0002'; end if;
 if a.completed_at is not null then raise exception 'Quiz già consegnato' using errcode='23505'; end if;
 if a.started_at<now()-interval '45 minutes' then raise exception 'Quiz scaduto' using errcode='22023'; end if;
 if not exists(
  select 1 from public.profile_memberships m
  join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id and m.service_branch=a.service_branch and m.active=true and p.active and not p.deleted
 ) then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;
 select p.username,m.initial_rank into v_username,v_initial
  from public.profiles p
  join public.profile_memberships m on m.user_id=p.id and m.service_branch=a.service_branch
  where p.id=p_user_id and m.active=true;
 foreach v_qid in array a.question_ids loop
  v_answer:=(p_answers->>v_idx)::integer;
  if v_answer is null or v_answer not between 0 and 3 then
   raise exception 'Risposta non valida' using errcode='22023';
  end if;
  select q.correct_index into v_key
   from public.quiz_questions q
   where q.id=v_qid and q.active and q.service_branch=a.service_branch
    and length(btrim(q.prompt))>=12
    and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
    and q.correct_index between 0 and 3
    and length(btrim(coalesce(q.explanation,'')))>=20
    and q.source_url ~ '^https://[^[:space:]]+$'
    and length(btrim(coalesce(q.source_note,'')))>=20
    and case when jsonb_typeof(q.options)='array' then
      (select count(distinct lower(btrim(option)))
       from jsonb_array_elements_text(q.options) as options(option))=4
      else false end
    and lower(btrim(q.prompt)) not like 'seleziona l''alternativa corretta:%'
    and lower(btrim(q.explanation)) not like '%la risposta è coerente con la normativa e con le informazioni istituzionali di riferimento%';
  if not found then raise exception 'Domanda non disponibile o priva di fonte verificabile' using errcode='P0002'; end if;
  if v_answer=v_key then v_score:=v_score+1; end if;
  v_idx:=v_idx+1;
 end loop;
 select coalesce(jsonb_agg(q.correct_index order by x.ord),'[]'::jsonb),
        coalesce(jsonb_agg(jsonb_build_object(
          'prompt',q.prompt,'options',q.options,'correct_index',q.correct_index,
          'correct_option',q.options->>q.correct_index,'explanation',q.explanation,
          'source_url',q.source_url,'source_note',q.source_note
        ) order by x.ord),'[]'::jsonb)
  into v_correct,v_review
  from unnest(a.question_ids) with ordinality x(id,ord)
  join public.quiz_questions q on q.id=x.id and q.service_branch=a.service_branch and q.active;
 if jsonb_array_length(v_review)<>4 then raise exception 'Revisione del quiz non disponibile' using errcode='P0002'; end if;
 select payload into v_old from public.progress where user_id=p_user_id and service_branch=a.service_branch for update;
 v_old:=coalesce(v_old,'{}'::jsonb);
 v_rank:=greatest(coalesce((v_old->>'rank')::integer,0),v_initial);
 v_streak:=case when v_score=4 then coalesce((v_old->>'streak')::integer,0)+1 else 0 end;
 v_award:=v_score*12+case when v_score=4 then 8+least(coalesce((v_old->>'streak')::integer,0),5)*2 else 0 end;
 v_total:=coalesce((v_old->>'totalExp')::integer,0)+v_award;
 v_exp:=least(greatest(0,coalesce((v_old->>'exp')::integer,0))+v_award,round((250+v_rank*60+v_rank*v_rank*4)/10.0)*10);
 v_history:=coalesce(v_old->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award));
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into v_history
  from (select value,ord from jsonb_array_elements(v_history) with ordinality e(value,ord) order by ord desc limit 20) x;
 v_payload:=jsonb_build_object('rank',v_rank,'exp',v_exp,'totalExp',v_total,
  'quizCount',coalesce((v_old->>'quizCount')::integer,0)+1,
  'correct',coalesce((v_old->>'correct')::integer,0)+v_score,'streak',v_streak,'history',v_history);
 insert into public.progress(user_id,service_branch,payload,updated_at)
  values(p_user_id,a.service_branch,v_payload,now())
  on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=excluded.updated_at;
 update public.quiz_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now() where id=p_attempt_id;
 insert into public.audit_logs(actor_id,actor_username,event,service_branch,details)
  values(p_user_id,v_username,'quiz_completed',a.service_branch,
   jsonb_build_object('correct',v_score,'level',v_rank,'attempt_id',p_attempt_id,'exp_awarded',v_award));
 return jsonb_build_object('score',v_score,'total',4,'exp_awarded',v_award,'progress',v_payload,
  'service_branch',a.service_branch,'correct_answers',v_correct,'review',v_review);
end;
$function$;

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
 v_review jsonb;
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
  when 'carabinieri' then 23 when 'finanza' then 23 when 'polizia' then 23
  when 'esercito' then 25 when 'marina' then 27 when 'aeronautica' then 25 else null end;
 if v_max_rank is null then raise exception 'Corpo non valido per l''esame' using errcode='22023'; end if;
 select m.initial_rank into v_initial
  from public.profile_memberships m join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id and m.service_branch=a.service_branch and m.active=true
   and p.active=true and p.deleted=false;
 if not found then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;
 select payload into v_payload from public.progress
  where user_id=p_user_id and service_branch=a.service_branch for update;
 v_payload:=coalesce(v_payload,'{}'::jsonb);
 v_rank:=greatest(coalesce((v_payload->>'rank')::integer,0),v_initial);
 v_exp:=greatest(0,coalesce((v_payload->>'exp')::integer,0));
 if v_rank>=v_max_rank then raise exception 'Hai già raggiunto il grado massimo previsto per il Corpo.' using errcode='22023'; end if;
 if v_rank<>a.from_rank then raise exception 'Il livello è cambiato: riapri l’esame' using errcode='22023'; end if;
 v_need:=round((250+v_rank*60+v_rank*v_rank*4)/10.0)*10;
 if v_exp<v_need then raise exception 'Non hai ancora raggiunto i requisiti EXP' using errcode='22023'; end if;
 foreach v_qid in array a.question_ids loop
  if jsonb_typeof(p_answers->v_idx)<>'number' or (p_answers->>v_idx)::integer not between 0 and 3 then
   raise exception 'Risposta non valida' using errcode='22023';
  end if;
  select q.correct_index into v_key from public.quiz_questions q
   where q.id=v_qid and q.active and q.service_branch=a.service_branch
    and length(btrim(q.prompt))>=12
    and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
    and q.correct_index between 0 and 3
    and length(btrim(coalesce(q.explanation,'')))>=20
    and q.source_url ~ '^https://[^[:space:]]+$'
    and length(btrim(coalesce(q.source_note,'')))>=20
    and case when jsonb_typeof(q.options)='array' then
      (select count(distinct lower(btrim(option)))
       from jsonb_array_elements_text(q.options) as options(option))=4
      else false end;
  if not found then raise exception 'Domanda non disponibile o priva di fonte verificabile' using errcode='P0002'; end if;
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
  on conflict(user_id,service_branch) do update set payload=excluded.payload,updated_at=now();
 update public.rank_exam_attempts set score=v_score,completed_at=now() where id=p_attempt_id;
 select jsonb_agg(q.correct_index order by x.ord),
        jsonb_agg(jsonb_build_object(
          'prompt',q.prompt,'options',q.options,'correct_index',q.correct_index,
          'correct_option',q.options->>q.correct_index,'explanation',q.explanation,
          'source_url',q.source_url,'source_note',q.source_note
        ) order by x.ord)
  into v_correct,v_review
  from unnest(a.question_ids) with ordinality x(id,ord)
  join public.quiz_questions q on q.id=x.id and q.service_branch=a.service_branch;
 if jsonb_array_length(coalesce(v_review,'[]'::jsonb))<>5 then raise exception 'Revisione dell’esame non disponibile' using errcode='P0002'; end if;
 return jsonb_build_object('score',v_score,'total',5,'passed',v_pass,
  'new_rank',case when v_pass then v_rank+1 else v_rank end,
  'progress',v_payload,'correct_answers',v_correct,'review',coalesce(v_review,'[]'::jsonb),'service_branch',a.service_branch);
end;
$function$;

create or replace function public.complete_department_quiz(p_user_id uuid,p_attempt_id uuid,p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
 v_attempt public.department_quiz_attempts%rowtype;
 v_member public.department_memberships%rowtype;
 v_correct jsonb;
 v_review jsonb;
 v_score integer;
 v_award integer;
 v_streak integer;
 v_exp integer;
 v_rank integer;
 v_commander uuid;
 v_branch text;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>4 then
  raise exception 'Risposte non valide';
 end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then
  raise exception 'Risposte non valide';
 end if;
 select * into v_attempt from public.department_quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione non trovata'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz reparto già consegnato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Sessione reparto scaduta'; end if;
 v_branch:=v_attempt.service_branch;
 select * into v_member from public.department_memberships
  where user_id=p_user_id and department_id=v_attempt.department_id and service_branch=v_branch for update;
 if not found then raise exception 'Appartenenza al reparto non valida'; end if;
 select commander_user_id into v_commander from public.department_commanders
  where department_id=v_attempt.department_id and service_branch=v_branch;
 if v_commander=p_user_id then raise exception 'Il comandante non può svolgere quiz personali di reparto'; end if;
 if v_member.rank>=6 and v_member.exp>=2100 then raise exception 'Hai raggiunto il 100%% EXP: puoi sostenere il Test di comando'; end if;
 select coalesce(jsonb_agg(q.correct_index order by x.ord),'[]'::jsonb),
        coalesce(jsonb_agg(jsonb_build_object(
          'prompt',q.prompt,'options',q.options,'correct_index',q.correct_index,
          'correct_option',q.options->>q.correct_index,'explanation',q.explanation,
          'source_url',q.source_url,'source_note',q.source_note
        ) order by x.ord),'[]'::jsonb)
  into v_correct,v_review
  from unnest(v_attempt.question_ids) with ordinality x(id,ord)
  join public.department_questions q on q.id=x.id
   and q.department_id=v_attempt.department_id and q.service_branch=v_branch and q.active
   and length(btrim(q.prompt))>=12
   and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
   and q.correct_index between 0 and 3
   and length(btrim(coalesce(q.explanation,'')))>=20
   and q.source_url ~ '^https://[^[:space:]]+$'
   and length(btrim(coalesce(q.source_note,'')))>=20
   and case when jsonb_typeof(q.options)='array' then
     (select count(distinct lower(btrim(option)))
      from jsonb_array_elements_text(q.options) as options(option))=4
     else false end;
 if jsonb_array_length(v_correct)<>4 then raise exception 'Banca reparto non verificata o priva di fonte'; end if;
 select count(*) into v_score from generate_series(0,3) i
  where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_streak:=case when v_score=4 then v_member.perfect_streak+1 else 0 end;
 v_award:=v_score*12+case when v_score=4 then 8+least((v_streak-1)*2,10) else 0 end;
 v_exp:=least(2100,v_member.exp+v_award);
 v_rank:=case when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4
  when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),
  quiz_count=quiz_count+1,correct_answers=correct_answers+v_score,perfect_streak=v_streak,
  history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','quiz')),
  updated_at=now()
  where user_id=p_user_id and department_id=v_attempt.department_id and service_branch=v_branch;
 update public.department_quiz_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,
  completed_at=now() where id=p_attempt_id and user_id=p_user_id and service_branch=v_branch;
 return jsonb_build_object('score',v_score,'total',4,'exp_awarded',v_award,'correct_answers',v_correct,
  'review',v_review,'membership',jsonb_build_object('department_id',v_attempt.department_id,'exp',v_exp,
   'rank',least(v_rank,6),'quiz_count',v_member.quiz_count+1,
   'correct_answers',v_member.correct_answers+v_score,'perfect_streak',v_streak,'service_branch',v_branch));
end;
$function$;

revoke all on function public.complete_quiz_attempt(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_quiz_attempt(uuid,uuid,jsonb) to service_role;
revoke all on function public.complete_rank_exam(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_rank_exam(uuid,uuid,jsonb) to service_role;
revoke all on function public.complete_department_quiz(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_department_quiz(uuid,uuid,jsonb) to service_role;

commit;
