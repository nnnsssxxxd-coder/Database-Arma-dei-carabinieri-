-- A patrol result cannot be submitted until all three server-recorded checks are complete.
DO $migration$
DECLARE
  v_definition text;
  v_old text := '  if v_session.expires_at < now() then';
  v_new text := E'  if not (coalesce(v_session.checks_completed, ''[]''::jsonb) @> ''["license","reports","inspection"]''::jsonb) then\n    raise exception ''Completa tutte e tre le verifiche prima della decisione finale'' using errcode = ''22023'';\n  end if;\n\n' || v_old;
BEGIN
  SELECT pg_get_functiondef('public.finish_traffic_control_session(uuid,uuid,text,text)'::regprocedure)
  INTO v_definition;

  IF position('Completa tutte e tre le verifiche prima della decisione finale' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected finish_traffic_control_session definition; refusing automatic patch';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
