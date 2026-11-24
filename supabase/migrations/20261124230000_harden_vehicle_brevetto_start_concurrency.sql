DO $migration$
DECLARE
  v_definition text;
  v_original text := E'begin\n  if p_user_id is null';
  v_hardened text := E'begin\n  if p_user_id is not null and p_service_branch in (''carabinieri'',''finanza'') then\n    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || '':'' || p_service_branch, 0));\n  end if;\n  if p_user_id is null';
BEGIN
  SELECT pg_get_functiondef('public.start_vehicle_brevetto_attempt(uuid,text,text)'::regprocedure)
  INTO v_definition;

  IF position('pg_advisory_xact_lock' IN v_definition) = 0 THEN
    IF position(v_original IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Unexpected start_vehicle_brevetto_attempt definition; refusing automatic patch';
    END IF;
    v_definition := replace(v_definition, v_original, v_hardened);
    EXECUTE v_definition;
  END IF;
END
$migration$;

-- Refresh PostgREST's cached RPC signatures after the migration.
NOTIFY pgrst, 'reload schema';
