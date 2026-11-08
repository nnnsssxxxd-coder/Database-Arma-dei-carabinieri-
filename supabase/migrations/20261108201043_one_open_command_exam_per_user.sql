create unique index if not exists department_command_exam_one_open_idx
on public.department_command_exam_attempts(user_id, department_id)
where completed_at is null;
