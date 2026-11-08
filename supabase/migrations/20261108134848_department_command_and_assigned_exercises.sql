create table if not exists public.department_commanders (
 department_id text primary key references public.department_catalog(id) on delete cascade,
 commander_user_id uuid not null unique references public.profiles(id) on delete restrict,
 vice_user_id uuid references public.profiles(id) on delete set null,
 appointed_at timestamptz not null default now()
);
create table if not exists public.department_exercises (
 id uuid primary key default gen_random_uuid(), department_id text not null references public.department_catalog(id) on delete cascade,
 assigned_by uuid not null references public.profiles(id) on delete restrict, title text not null check(length(title) between 3 and 100),
 created_at timestamptz not null default now(), active boolean not null default true
);
create table if not exists public.department_exercise_questions (
 id uuid primary key default gen_random_uuid(), exercise_id uuid not null references public.department_exercises(id) on delete cascade,
 prompt text not null check(length(prompt) between 10 and 700), options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
 correct_index smallint not null check(correct_index between 0 and 3), explanation text not null default ''
);
create table if not exists public.department_exercise_assignments (
 id uuid primary key default gen_random_uuid(), exercise_id uuid not null references public.department_exercises(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, assigned_at timestamptz not null default now(), unique(exercise_id,user_id)
);
create table if not exists public.department_exercise_attempts (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null unique references public.department_exercise_assignments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, answers jsonb, score smallint, correct_answers smallint,
 started_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.department_command_exam_attempts (
 id uuid primary key default gen_random_uuid(), department_id text not null references public.department_catalog(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, answers jsonb, score smallint, passed boolean,
 started_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists dept_exercise_assignments_user_idx on public.department_exercise_assignments(user_id,assigned_at desc);
create index if not exists dept_exercise_attempts_user_idx on public.department_exercise_attempts(user_id,completed_at desc);
create index if not exists dept_command_exam_user_idx on public.department_command_exam_attempts(user_id,started_at desc);
alter table public.department_commanders enable row level security;
alter table public.department_exercises enable row level security;
alter table public.department_exercise_questions enable row level security;
alter table public.department_exercise_assignments enable row level security;
alter table public.department_exercise_attempts enable row level security;
alter table public.department_command_exam_attempts enable row level security;
revoke all on public.department_commanders,public.department_exercises,public.department_exercise_questions,public.department_exercise_assignments,public.department_exercise_attempts,public.department_command_exam_attempts from anon,authenticated;
create policy department_commanders_deny_client on public.department_commanders for all to anon,authenticated using(false) with check(false);
create policy department_exercises_deny_client on public.department_exercises for all to anon,authenticated using(false) with check(false);
create policy department_exercise_questions_deny_client on public.department_exercise_questions for all to anon,authenticated using(false) with check(false);
create policy department_exercise_assignments_deny_client on public.department_exercise_assignments for all to anon,authenticated using(false) with check(false);
create policy department_exercise_attempts_deny_client on public.department_exercise_attempts for all to anon,authenticated using(false) with check(false);
create policy department_command_exam_attempts_deny_client on public.department_command_exam_attempts for all to anon,authenticated using(false) with check(false);
create or replace function public.promote_department_commander(p_user_id uuid,p_department_id text,p_exam_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.department_memberships%rowtype; v_current uuid; v_attempt public.department_command_exam_attempts%rowtype;
begin
 if p_user_id is null or p_department_id is null or p_exam_attempt_id is null then raise exception 'Richiesta non valida'; end if;
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
