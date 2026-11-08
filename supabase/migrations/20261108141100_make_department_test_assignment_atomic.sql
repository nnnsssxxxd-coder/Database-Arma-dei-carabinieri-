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

revoke all on function public.assign_department_exercise(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.assign_department_exercise(uuid,text,text,jsonb) to service_role;