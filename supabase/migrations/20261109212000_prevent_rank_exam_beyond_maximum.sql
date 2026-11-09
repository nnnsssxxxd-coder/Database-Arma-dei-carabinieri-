-- Prevent rank exams from advancing beyond each service's configured maximum grade.
-- The Comando Generale eligibility checks rely on these exact terminal rank indices.
CREATE OR REPLACE FUNCTION public.complete_rank_exam(p_user_id uuid, p_attempt_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
 if a.service_branch='carabinieri' then v_max_rank:=23;
 elsif a.service_branch='finanza' then v_max_rank:=24;
 else raise exception 'Corpo non valido per l''esame' using errcode='22023';
 end if;
 select initial_rank into v_initial from public.profile_memberships
  where user_id=p_user_id and service_branch=a.service_branch and active=true;
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
