create unique index if not exists department_quiz_one_open_per_user_idx
on public.department_quiz_attempts(user_id)
where completed_at is null;