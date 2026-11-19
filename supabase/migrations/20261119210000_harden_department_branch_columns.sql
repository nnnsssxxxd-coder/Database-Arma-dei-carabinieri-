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
