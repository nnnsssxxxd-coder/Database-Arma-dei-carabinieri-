alter table public.department_exercise_attempts add column if not exists exp_awarded integer not null default 0;

create index if not exists department_command_exam_attempts_department_idx on public.department_command_exam_attempts(department_id);

create index if not exists department_commanders_vice_user_idx on public.department_commanders(vice_user_id) where vice_user_id is not null;

create index if not exists department_exercise_questions_exercise_idx on public.department_exercise_questions(exercise_id);

create index if not exists department_exercises_assigned_by_idx on public.department_exercises(assigned_by);

create index if not exists department_exercises_department_idx on public.department_exercises(department_id);

CREATE OR REPLACE FUNCTION public.promote_department_commander(p_user_id uuid, p_department_id text, p_exam_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_member public.department_memberships%rowtype; v_current uuid; v_attempt public.department_command_exam_attempts%rowtype;
begin
 if p_user_id is null or p_department_id is null or p_exam_attempt_id is null then raise exception 'Richiesta non valida'; end if;
 perform pg_advisory_xact_lock(hashtext(p_department_id));
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=p_department_id for update;
 if not found or v_member.rank<>6 or v_member.exp<2100 then raise exception 'Per il Test di comando servono grado Vice comandante e 100%% EXP'; end if;
 select * into v_attempt from public.department_command_exam_attempts where id=p_exam_attempt_id and user_id=p_user_id and department_id=p_department_id for update;
 if not found or v_attempt.completed_at is not null or v_attempt.started_at<now()-interval '30 minutes' then raise exception 'Prova non valida o scaduta'; end if;
 if v_attempt.passed is distinct from true or v_attempt.score<4 then raise exception 'Prova di comando non superata'; end if;
 select commander_user_id into v_current from public.department_commanders where department_id=p_department_id for update;
 if v_current is not null and v_current<>p_user_id then update public.department_memberships set rank=6,updated_at=now() where user_id=v_current and department_id=p_department_id; end if;
 insert into public.department_commanders(department_id,commander_user_id,vice_user_id,appointed_at) values(p_department_id,p_user_id,case when v_current is not null and v_current<>p_user_id then v_current else null end,now())
 on conflict(department_id) do update set commander_user_id=excluded.commander_user_id,vice_user_id=excluded.vice_user_id,appointed_at=now();
 update public.department_memberships set rank=7,updated_at=now() where user_id=p_user_id and department_id=p_department_id;
 update public.department_command_exam_attempts set completed_at=now() where id=p_exam_attempt_id;
 return jsonb_build_object('promoted',true,'previous_commander',v_current,'rank',7);
end $function$


CREATE OR REPLACE FUNCTION public.complete_department_quiz(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_attempt public.department_quiz_attempts%rowtype; v_member public.department_memberships%rowtype; v_correct jsonb; v_score integer; v_award integer; v_streak integer; v_exp integer; v_rank integer; v_commander uuid;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>4 then raise exception 'Risposte non valide'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide'; end if;
 select * into v_attempt from public.department_quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione non trovata'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz reparto già consegnato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Sessione reparto scaduta'; end if;
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=v_attempt.department_id for update;
 if not found then raise exception 'Appartenenza al reparto non valida'; end if;
 select commander_user_id into v_commander from public.department_commanders where department_id=v_attempt.department_id;
 if v_commander=p_user_id then raise exception 'Il comandante non può svolgere quiz personali di reparto'; end if;
 if v_member.rank>=6 and v_member.exp>=2100 then raise exception 'Hai raggiunto il 100%% EXP: puoi sostenere il Test di comando'; end if;
 select coalesce(jsonb_agg(q.correct_index order by x.ord),'[]'::jsonb) into v_correct from unnest(v_attempt.question_ids) with ordinality x(id,ord) join public.department_questions q on q.id=x.id and q.department_id=v_attempt.department_id;
 if jsonb_array_length(v_correct)<>4 then raise exception 'Banca domande non disponibile'; end if;
 select count(*) into v_score from generate_series(0,3) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_streak:=case when v_score=4 then v_member.perfect_streak+1 else 0 end;
 v_award:=v_score*12+case when v_score=4 then 8+least((v_streak-1)*2,10) else 0 end;
 v_exp:=least(2100,v_member.exp+v_award);
 v_rank:=case when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4 when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),quiz_count=quiz_count+1,correct_answers=correct_answers+v_score,perfect_streak=v_streak,history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','quiz')),updated_at=now() where user_id=p_user_id and department_id=v_attempt.department_id;
 update public.department_quiz_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now() where id=p_attempt_id;
 return jsonb_build_object('score',v_score,'total',4,'exp_awarded',v_award,'correct_answers',v_correct,'membership',jsonb_build_object('department_id',v_attempt.department_id,'exp',v_exp,'rank',least(v_rank,6),'quiz_count',v_member.quiz_count+1,'correct_answers',v_member.correct_answers+v_score,'perfect_streak',v_streak));
end $function$


CREATE OR REPLACE FUNCTION public.complete_department_exercise(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_attempt public.department_exercise_attempts%rowtype; v_assignment public.department_exercise_assignments%rowtype; v_exercise public.department_exercises%rowtype; v_member public.department_memberships%rowtype; v_correct jsonb; v_score integer; v_award integer; v_exp integer; v_rank integer; v_commander uuid;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>6 then raise exception 'Risposte non valide'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide'; end if;
 select * into v_attempt from public.department_exercise_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found or v_attempt.completed_at is not null then raise exception 'Test non trovato o già completato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Test scaduto'; end if;
 select * into v_assignment from public.department_exercise_assignments where id=v_attempt.assignment_id and user_id=p_user_id;
 if not found then raise exception 'Assegnazione non valida'; end if;
 select * into v_exercise from public.department_exercises where id=v_assignment.exercise_id and active;
 if not found then raise exception 'Test non più disponibile'; end if;
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=v_exercise.department_id for update;
 if not found then raise exception 'Non appartieni a questo reparto'; end if;
 select commander_user_id into v_commander from public.department_commanders where department_id=v_exercise.department_id;
 if v_commander=p_user_id then raise exception 'Il comandante non può svolgere test assegnati a sé stesso'; end if;
 select coalesce(jsonb_agg(correct_index order by id),'[]'::jsonb) into v_correct from public.department_exercise_questions where exercise_id=v_exercise.id;
 if jsonb_array_length(v_correct)<>6 then raise exception 'Banca domande non valida'; end if;
 select count(*) into v_score from generate_series(0,5) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_award:=v_score*12+case when v_score=6 then 8 else 0 end;
 v_exp:=least(2100,v_member.exp+v_award);
 v_rank:=case when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4 when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),correct_answers=correct_answers+v_score,history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','assigned_test')),updated_at=now() where user_id=p_user_id and department_id=v_exercise.department_id;
 update public.department_exercise_attempts set answers=p_answers,score=v_score,correct_answers=v_score,exp_awarded=v_award,completed_at=now() where id=p_attempt_id;
 return jsonb_build_object('score',v_score,'total',6,'correct_answers',v_score,'exp_awarded',v_award,'membership',jsonb_build_object('department_id',v_exercise.department_id,'exp',v_exp,'rank',least(v_rank,6)));
end $function$


CREATE OR REPLACE FUNCTION public.assign_department_exercise(p_user_id uuid, p_department_id text, p_title text, p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_member public.department_memberships%rowtype;
 v_commander uuid;
 v_exercise_id uuid;
 v_assigned integer;
begin
 if p_user_id is null or p_department_id is null or length(trim(coalesce(p_title,''))) not between 3 and 100
    or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)<>6 then
   raise exception 'Dati del test non validi';
 end if;
 if exists(
   select 1 from jsonb_array_elements(p_questions) q
   where length(coalesce(q->>'prompt','')) not between 10 and 700
      or jsonb_typeof(q->'options')<>'array'
      or jsonb_array_length(q->'options')<>4
      or coalesce((q->>'correct_index')::integer,-1) not between 0 and 3
 ) then raise exception 'Le sei domande del test non sono valide'; end if;
 select * into v_member from public.department_memberships
  where user_id=p_user_id and department_id=p_department_id for update;
 if not found or v_member.rank<>7 then raise exception 'Appartenenza o grado comandante non valido'; end if;
 select commander_user_id into v_commander from public.department_commanders
  where department_id=p_department_id for update;
 if v_commander is distinct from p_user_id then raise exception 'Solo il comandante in carica può assegnare test'; end if;
 insert into public.department_exercises(department_id,assigned_by,title)
 values(p_department_id,p_user_id,trim(p_title)) returning id into v_exercise_id;
 insert into public.department_exercise_questions(exercise_id,prompt,options,correct_index,explanation)
 select v_exercise_id,q->>'prompt',q->'options',(q->>'correct_index')::smallint,coalesce(q->>'explanation','')
 from jsonb_array_elements(p_questions) q;
 insert into public.department_exercise_assignments(exercise_id,user_id)
 select v_exercise_id,m.user_id from public.department_memberships m
 where m.department_id=p_department_id and m.user_id<>p_user_id;
 get diagnostics v_assigned=row_count;
 return jsonb_build_object('exercise_id',v_exercise_id,'assigned',v_assigned,'title',trim(p_title));
end $function$


revoke all on function public.promote_department_commander(uuid,text,uuid) from public,anon,authenticated; grant execute on function public.promote_department_commander(uuid,text,uuid) to service_role;

revoke all on function public.complete_department_quiz(uuid,uuid,jsonb) from public,anon,authenticated; grant execute on function public.complete_department_quiz(uuid,uuid,jsonb) to service_role;

revoke all on function public.complete_department_exercise(uuid,uuid,jsonb) from public,anon,authenticated; grant execute on function public.complete_department_exercise(uuid,uuid,jsonb) to service_role;

revoke all on function public.assign_department_exercise(uuid,text,text,jsonb) from public,anon,authenticated; grant execute on function public.assign_department_exercise(uuid,text,text,jsonb) to service_role;