
-- Estende il motore carriera/reparti alla Guardia di Finanza senza condividere dati tra Corpi.
insert into public.department_catalog(id,name,description,source_url,service_branch,active) values
('gdf_scico','Servizio Centrale di Investigazione sulla Criminalità Organizzata (S.C.I.C.O.)','Struttura centrale a carattere nazionale che indirizza, coordina e supporta le investigazioni sulla criminalità organizzata.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_gico','Gruppi di Investigazione sulla Criminalità Organizzata (G.I.C.O.)','Gruppi specialistici territoriali che operano nell’ambito del contrasto alla criminalità organizzata, in raccordo con lo S.C.I.C.O.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_polizia_valutaria','Nucleo Speciale di Polizia Valutaria','Reparto specializzato nella tutela dei mercati finanziari, nel contrasto al riciclaggio e negli approfondimenti su flussi finanziari e operazioni sospette.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_tutela_entrate','Nucleo Speciale Tutela Entrate e Repressione Frodi Fiscali','Reparto specializzato nella tutela delle entrate pubbliche e nel contrasto ai fenomeni più complessi di evasione, elusione e frodi fiscali.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_spesa_pubblica','Nucleo Speciale Spesa Pubblica e Repressione Frodi Comunitarie','Reparto dedicato alla tutela della spesa pubblica e dei fondi europei, nazionali e locali e al contrasto delle frodi correlate.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_anticorruzione','Nucleo Speciale Anticorruzione','Reparto che opera a tutela della legalità nella Pubblica Amministrazione e collabora con le autorità competenti in materia di prevenzione della corruzione.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_privacy_frodi','Nucleo Speciale Tutela Privacy e Frodi Tecnologiche','Reparto specializzato nel contrasto agli illeciti economico-finanziari commessi attraverso strumenti e reti informatiche e nella tutela della riservatezza.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_beni_servizi','Nucleo Speciale Beni e Servizi','Reparto che tutela marchi, brevetti, proprietà intellettuale, sicurezza e conformità dei prodotti e contrasta la contraffazione.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_antitrust','Nucleo Speciale Antitrust','Reparto referente per la collaborazione con l’Autorità Garante della Concorrenza e del Mercato e per la tutela della concorrenza.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-speciali','finanza',true),
('gdf_atpi','Reparti Antiterrorismo e Pronto Impiego (A.T.P.I.)','Componente specializzata impiegata in concorso alle attività di sicurezza interna, mantenendo la matrice economico-finanziaria del Corpo.','https://www.gdf.gov.it/it/cosa-facciamo/polizia-economico-finanziaria/concorso-alla-sicurezza-interna-ed-esterna-del-paese/la-sicurezza-pubblica','finanza',true),
('gdf_aeronavale','Reparti Aeronavali Speciali','Componente che assolve i compiti istituzionali sul mare e coordina le attività aeronavali di altura a supporto della componente territoriale.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/reparti/reparti-operativi/reparti-aeronavali-speciali','finanza',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,source_url=excluded.source_url,service_branch=excluded.service_branch,active=true;

-- Ogni reparto Finanza riceve una banca indipendente di 100 quesiti dal pool formativo GdF.
insert into public.department_questions(department_id,rank_band,prompt,options,correct_index,explanation,active,sort_order,service_branch)
select d.id,
       case lower(q.difficulty) when 'base' then 0 when 'intermedio' then 1 else 2 end,
       q.prompt,q.options,q.correct_index,coalesce(q.explanation,''),true,q.sort_order,'finanza'
from public.department_catalog d
cross join public.quiz_questions q
where d.service_branch='finanza'
  and d.id in ('gdf_scico','gdf_gico','gdf_polizia_valutaria','gdf_tutela_entrate','gdf_spesa_pubblica','gdf_anticorruzione','gdf_privacy_frodi','gdf_beni_servizi','gdf_antitrust','gdf_atpi','gdf_aeronavale')
  and q.service_branch='finanza' and q.active=true
  and not exists (
    select 1 from public.department_questions existing
    where existing.department_id=d.id and existing.service_branch='finanza' and existing.prompt=q.prompt
  );

create or replace function public.assign_department_exercise(p_user_id uuid,p_department_id text,p_title text,p_questions jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_member public.department_memberships%rowtype;
 v_commander uuid;
 v_exercise_id uuid;
 v_assigned integer;
 v_branch text;
begin
 if p_user_id is null or p_department_id is null or length(trim(coalesce(p_title,''))) not between 3 and 100
    or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)<>6 then
   raise exception 'Dati del test non validi';
 end if;
 if exists(select 1 from jsonb_array_elements(p_questions) q
   where length(coalesce(q->>'prompt','')) not between 10 and 700
      or jsonb_typeof(q->'options')<>'array' or jsonb_array_length(q->'options')<>4
      or coalesce((q->>'correct_index')::integer,-1) not between 0 and 3) then
   raise exception 'Le sei domande del test non sono valide';
 end if;
 select service_branch into v_branch from public.department_catalog where id=p_department_id and active=true;
 if v_branch is null then raise exception 'Reparto non valido'; end if;
 select * into v_member from public.department_memberships
  where user_id=p_user_id and department_id=p_department_id and service_branch=v_branch for update;
 if not found or v_member.rank<>7 then raise exception 'Appartenenza o grado comandante non valido'; end if;
 select commander_user_id into v_commander from public.department_commanders
  where department_id=p_department_id and service_branch=v_branch for update;
 if v_commander is distinct from p_user_id then raise exception 'Solo il comandante in carica può assegnare test'; end if;
 insert into public.department_exercises(department_id,assigned_by,title,service_branch)
 values(p_department_id,p_user_id,trim(p_title),v_branch) returning id into v_exercise_id;
 insert into public.department_exercise_questions(exercise_id,prompt,options,correct_index,explanation,service_branch)
 select v_exercise_id,q->>'prompt',q->'options',(q->>'correct_index')::smallint,coalesce(q->>'explanation',''),v_branch
 from jsonb_array_elements(p_questions) q;
 insert into public.department_exercise_assignments(exercise_id,user_id,service_branch)
 select v_exercise_id,m.user_id,v_branch from public.department_memberships m
 where m.department_id=p_department_id and m.service_branch=v_branch and m.user_id<>p_user_id and m.rank<7;
 get diagnostics v_assigned=row_count;
 return jsonb_build_object('exercise_id',v_exercise_id,'assigned',v_assigned,'title',trim(p_title),'service_branch',v_branch);
end; $$;

create or replace function public.complete_department_quiz(p_user_id uuid,p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_attempt public.department_quiz_attempts%rowtype;
 v_member public.department_memberships%rowtype;
 v_correct jsonb;
 v_score integer;
 v_award integer;
 v_streak integer;
 v_exp integer;
 v_rank integer;
 v_commander uuid;
 v_branch text;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>4 then raise exception 'Risposte non valide'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide'; end if;
 select * into v_attempt from public.department_quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione non trovata'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz reparto già consegnato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Sessione reparto scaduta'; end if;
 v_branch:=v_attempt.service_branch;
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=v_attempt.department_id and service_branch=v_branch for update;
 if not found then raise exception 'Appartenenza al reparto non valida'; end if;
 select commander_user_id into v_commander from public.department_commanders where department_id=v_attempt.department_id and service_branch=v_branch;
 if v_commander=p_user_id then raise exception 'Il comandante non può svolgere quiz personali di reparto'; end if;
 if v_member.rank>=6 and v_member.exp>=2100 then raise exception 'Hai raggiunto il 100%% EXP: puoi sostenere il Test di comando'; end if;
 select coalesce(jsonb_agg(q.correct_index order by x.ord),'[]'::jsonb) into v_correct
 from unnest(v_attempt.question_ids) with ordinality x(id,ord)
 join public.department_questions q on q.id=x.id and q.department_id=v_attempt.department_id and q.service_branch=v_branch;
 if jsonb_array_length(v_correct)<>4 then raise exception 'Banca domande non disponibile'; end if;
 select count(*) into v_score from generate_series(0,3) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_streak:=case when v_score=4 then v_member.perfect_streak+1 else 0 end;
 v_award:=v_score*12+case when v_score=4 then 8+least((v_streak-1)*2,10) else 0 end;
 v_exp:=least(2100,v_member.exp+v_award);
 v_rank:=case when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4 when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),quiz_count=quiz_count+1,correct_answers=correct_answers+v_score,perfect_streak=v_streak,history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','quiz')),updated_at=now()
 where user_id=p_user_id and department_id=v_attempt.department_id and service_branch=v_branch;
 update public.department_quiz_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now()
 where id=p_attempt_id and user_id=p_user_id and service_branch=v_branch;
 return jsonb_build_object('score',v_score,'total',4,'exp_awarded',v_award,'correct_answers',v_correct,'membership',jsonb_build_object('department_id',v_attempt.department_id,'exp',v_exp,'rank',least(v_rank,6),'quiz_count',v_member.quiz_count+1,'correct_answers',v_member.correct_answers+v_score,'perfect_streak',v_streak,'service_branch',v_branch));
end; $$;

create or replace function public.complete_department_exercise(p_user_id uuid,p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_attempt public.department_exercise_attempts%rowtype;
 v_assignment public.department_exercise_assignments%rowtype;
 v_exercise public.department_exercises%rowtype;
 v_member public.department_memberships%rowtype;
 v_correct jsonb;
 v_score integer;
 v_award integer;
 v_exp integer;
 v_rank integer;
 v_commander uuid;
 v_branch text;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>6 then raise exception 'Risposte non valide'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide'; end if;
 select * into v_attempt from public.department_exercise_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found or v_attempt.completed_at is not null then raise exception 'Test non trovato o già completato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Test scaduto'; end if;
 v_branch:=v_attempt.service_branch;
 select * into v_assignment from public.department_exercise_assignments where id=v_attempt.assignment_id and user_id=p_user_id and service_branch=v_branch;
 if not found then raise exception 'Assegnazione non valida'; end if;
 select * into v_exercise from public.department_exercises where id=v_assignment.exercise_id and active and service_branch=v_branch;
 if not found then raise exception 'Test non più disponibile'; end if;
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=v_exercise.department_id and service_branch=v_branch for update;
 if not found then raise exception 'Non appartieni a questo reparto'; end if;
 select commander_user_id into v_commander from public.department_commanders where department_id=v_exercise.department_id and service_branch=v_branch;
 if v_commander=p_user_id then raise exception 'Il comandante non può svolgere test assegnati a sé stesso'; end if;
 select coalesce(jsonb_agg(correct_index order by id),'[]'::jsonb) into v_correct from public.department_exercise_questions where exercise_id=v_exercise.id and service_branch=v_branch;
 if jsonb_array_length(v_correct)<>6 then raise exception 'Banca domande non valida'; end if;
 select count(*) into v_score from generate_series(0,5) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 v_award:=v_score*12+case when v_score=6 then 8 else 0 end;
 v_exp:=least(2100,v_member.exp+v_award);
 v_rank:=case when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4 when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),correct_answers=correct_answers+v_score,history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award,'type','assigned_test')),updated_at=now()
 where user_id=p_user_id and department_id=v_exercise.department_id and service_branch=v_branch;
 update public.department_exercise_attempts set answers=p_answers,score=v_score,correct_answers=v_score,exp_awarded=v_award,completed_at=now()
 where id=p_attempt_id and user_id=p_user_id and service_branch=v_branch;
 return jsonb_build_object('score',v_score,'total',6,'correct_answers',v_score,'exp_awarded',v_award,'membership',jsonb_build_object('department_id',v_exercise.department_id,'exp',v_exp,'rank',least(v_rank,6),'service_branch',v_branch));
end; $$;

create or replace function public.promote_department_commander(p_user_id uuid,p_department_id text,p_exam_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_member public.department_memberships%rowtype;
 v_current uuid;
 v_attempt public.department_command_exam_attempts%rowtype;
 v_branch text;
begin
 if p_user_id is null or p_department_id is null or p_exam_attempt_id is null then raise exception 'Richiesta non valida'; end if;
 select service_branch into v_branch from public.department_catalog where id=p_department_id and active=true;
 if v_branch is null then raise exception 'Reparto non valido'; end if;
 perform pg_advisory_xact_lock(hashtext(v_branch||':'||p_department_id));
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=p_department_id and service_branch=v_branch for update;
 if not found or v_member.rank<>6 or v_member.exp<2100 then raise exception 'Per il Test di comando servono grado Vice comandante e 100%% EXP'; end if;
 select * into v_attempt from public.department_command_exam_attempts where id=p_exam_attempt_id and user_id=p_user_id and department_id=p_department_id and service_branch=v_branch for update;
 if not found or v_attempt.completed_at is not null or v_attempt.started_at<now()-interval '30 minutes' then raise exception 'Prova non valida o scaduta'; end if;
 if v_attempt.passed is distinct from true or v_attempt.score<4 then raise exception 'Prova di comando non superata'; end if;
 select commander_user_id into v_current from public.department_commanders where department_id=p_department_id and service_branch=v_branch for update;
 if v_current is not null and v_current<>p_user_id then
   update public.department_memberships set rank=6,updated_at=now() where user_id=v_current and department_id=p_department_id and service_branch=v_branch;
 end if;
 insert into public.department_commanders(department_id,commander_user_id,vice_user_id,appointed_at,service_branch)
 values(p_department_id,p_user_id,case when v_current is not null and v_current<>p_user_id then v_current else null end,now(),v_branch)
 on conflict(department_id) do update set commander_user_id=excluded.commander_user_id,vice_user_id=excluded.vice_user_id,appointed_at=now(),service_branch=excluded.service_branch;
 update public.department_memberships set rank=7,updated_at=now() where user_id=p_user_id and department_id=p_department_id and service_branch=v_branch;
 update public.department_command_exam_attempts set completed_at=now() where id=p_exam_attempt_id and service_branch=v_branch;
 return jsonb_build_object('promoted',true,'previous_commander',v_current,'rank',7,'service_branch',v_branch);
end; $$;
