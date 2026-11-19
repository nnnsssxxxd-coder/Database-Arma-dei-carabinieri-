-- Ensure every department-career table is explicitly scoped to its service branch.
-- Existing records belong to the original Carabinieri career and are backfilled accordingly.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'department_catalog','department_memberships','department_questions','department_quiz_attempts',
    'department_commanders','department_exercises','department_exercise_questions',
    'department_exercise_assignments','department_exercise_attempts','department_command_exam_attempts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS service_branch text', table_name);
    EXECUTE format('UPDATE public.%I SET service_branch = ''carabinieri'' WHERE service_branch IS NULL', table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN service_branch SET DEFAULT ''carabinieri''', table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN service_branch SET NOT NULL', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = format('public.%I', table_name)::regclass AND conname = table_name || '_service_branch_check') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (service_branch IN (''carabinieri'', ''finanza'')) NOT VALID', table_name, table_name || '_service_branch_check');
    END IF;
    EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', table_name, table_name || '_service_branch_check');
  END LOOP;
END $$;

-- Repair migration for deployments where the Finanza career migration was already recorded.
-- Safe to run repeatedly: existing branch values are preserved.

-- Restore a missing progression row for any active membership and reconcile rank metadata.
-- Existing EXP, total EXP, streaks and history are preserved.
INSERT INTO public.progress(user_id,service_branch,payload,updated_at)
SELECT m.user_id,m.service_branch,
       jsonb_build_object('rank',m.initial_rank,'exp',0,'totalExp',0,'streak',0,'correct',0,'history','[]'::jsonb,'quizCount',0),
       now()
FROM public.profile_memberships m
LEFT JOIN public.progress p
  ON p.user_id=m.user_id AND p.service_branch=m.service_branch
WHERE m.active AND p.user_id IS NULL
ON CONFLICT(user_id,service_branch) DO NOTHING;

UPDATE public.progress p
SET payload=jsonb_set(
      p.payload,
      '{rank}',
      to_jsonb(greatest(
        CASE WHEN (p.payload->>'rank') ~ '^-?[0-9]+$' THEN (p.payload->>'rank')::integer ELSE 0 END,
        m.initial_rank
      )),
      true
    ),
    updated_at=now()
FROM public.profile_memberships m
WHERE p.user_id=m.user_id
  AND p.service_branch=m.service_branch
  AND m.active
  AND CASE WHEN (p.payload->>'rank') ~ '^-?[0-9]+$' THEN (p.payload->>'rank')::integer ELSE 0 END < m.initial_rank;
