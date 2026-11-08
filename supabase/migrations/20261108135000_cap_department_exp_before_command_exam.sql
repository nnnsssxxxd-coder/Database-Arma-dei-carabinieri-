create or replace function public.complete_department_quiz(p_user_id uuid,p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_attempt public.department_quiz_attempts%rowtype; v_member public.department_memberships%rowtype;
 v_correct jsonb; v_score integer; v_award integer; v_streak integer; v_exp integer; v_rank integer;
begin
 if p_user_id is null or p_attempt_id is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>4 then raise exception 'Risposte non valide'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) a where (a#>>'{}') !~ '^[0-3]$') then raise exception 'Risposte non valide'; end if;
 select * into v_attempt from public.department_quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Sessione non trovata'; end if;
 if v_attempt.completed_at is not null then raise exception 'Quiz reparto già consegnato'; end if;
 if v_attempt.started_at<now()-interval '45 minutes' then raise exception 'Sessione reparto scaduta'; end if;
 select coalesce(jsonb_agg(q.correct_index order by x.ord),'[]'::jsonb) into v_correct from unnest(v_attempt.question_ids) with ordinality x(id,ord)
 join public.department_questions q on q.id=x.id and q.department_id=v_attempt.department_id;
 if jsonb_array_length(v_correct)<>4 then raise exception 'Banca domande non disponibile'; end if;
 select count(*) into v_score from generate_series(0,3) i where (p_answers->>i)::integer=(v_correct->>i)::integer;
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=v_attempt.department_id for update;
 if not found then raise exception 'Appartenenza al reparto non valida'; end if;
 v_streak:=case when v_score=4 then v_member.perfect_streak+1 else 0 end;
 v_award:=v_score*12+case when v_score=4 then 8+least((v_streak-1)*2,10) else 0 end;
 v_exp:=v_member.exp+v_award;
 v_rank:=case when v_exp>=2100 then 6 when v_exp>=1620 then 6 when v_exp>=1200 then 5 when v_exp>=840 then 4 when v_exp>=540 then 3 when v_exp>=300 then 2 when v_exp>=120 then 1 else 0 end;
 update public.department_memberships set exp=v_exp,rank=least(v_rank,6),quiz_count=quiz_count+1,correct_answers=correct_answers+v_score,perfect_streak=v_streak,
 history=history||jsonb_build_array(jsonb_build_object('date',now(),'correct',v_score,'exp',v_award)),updated_at=now() where user_id=p_user_id;
 update public.department_quiz_attempts set answers=p_answers,score=v_score,exp_awarded=v_award,completed_at=now() where id=p_attempt_id;
 return jsonb_build_object('score',v_score,'total',4,'exp_awarded',v_award,'correct_answers',v_correct,
 'membership',jsonb_build_object('department_id',v_attempt.department_id,'exp',v_exp,'rank',least(v_rank,6),'quiz_count',v_member.quiz_count+1,'correct_answers',v_member.correct_answers+v_score,'perfect_streak',v_streak));
end $$;
revoke all on function public.complete_department_quiz(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_department_quiz(uuid,uuid,jsonb) to service_role;