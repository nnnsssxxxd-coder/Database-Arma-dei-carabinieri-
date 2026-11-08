create or replace function public.promote_department_commander(p_user_id uuid,p_department_id text,p_exam_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.department_memberships%rowtype; v_current uuid; v_attempt public.department_command_exam_attempts%rowtype;
begin
 if p_user_id is null or p_department_id is null or p_exam_attempt_id is null then raise exception 'Richiesta non valida'; end if;
 perform pg_advisory_xact_lock(hashtext(p_department_id));
 select * into v_member from public.department_memberships where user_id=p_user_id and department_id=p_department_id for update;
 if not found or v_member.rank<6 then raise exception 'Requisito di grado non raggiunto'; end if;
 select * into v_attempt from public.department_command_exam_attempts where id=p_exam_attempt_id and user_id=p_user_id and department_id=p_department_id for update;
 if not found or v_attempt.completed_at is not null or v_attempt.started_at<now()-interval '30 minutes' then raise exception 'Prova non valida o scaduta'; end if;
 if v_attempt.passed is distinct from true or v_attempt.score<5 then raise exception 'Prova di comando non superata'; end if;
 select commander_user_id into v_current from public.department_commanders where department_id=p_department_id for update;
 if v_current is not null and v_current<>p_user_id then update public.department_memberships set rank=6,updated_at=now() where user_id=v_current and department_id=p_department_id; end if;
 insert into public.department_commanders(department_id,commander_user_id,vice_user_id,appointed_at)
 values(p_department_id,p_user_id,case when v_current is not null and v_current<>p_user_id then v_current else null end,now())
 on conflict(department_id) do update set commander_user_id=excluded.commander_user_id,vice_user_id=excluded.vice_user_id,appointed_at=now();
 update public.department_memberships set rank=7,updated_at=now() where user_id=p_user_id and department_id=p_department_id;
 update public.department_command_exam_attempts set completed_at=now() where id=p_exam_attempt_id;
 return jsonb_build_object('promoted',true,'previous_commander',v_current,'rank',7);
end $$;
revoke all on function public.promote_department_commander(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.promote_department_commander(uuid,text,uuid) to service_role;