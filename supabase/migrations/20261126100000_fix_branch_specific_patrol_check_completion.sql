-- Require the correct three checks for the selected service branch.
-- Carabinieri retain the road-control checks; Guardia di Finanza uses fiscal/economic checks.
DO $migration$
DECLARE
  v_definition text;
  v_old text := $old$  if not (coalesce(v_session.checks_completed, '[]'::jsonb) @> '["license","reports","inspection"]'::jsonb) then
    raise exception 'Completa tutte e tre le verifiche prima della decisione finale' using errcode = '22023';
  end if;$old$;
  v_new text := $new$  if p_service_branch = 'finanza' then
    if not (coalesce(v_session.checks_completed, '[]'::jsonb) @> '["fiscal_docs","accounting","inventory"]'::jsonb) then
      raise exception 'Completa tutte e tre le verifiche economico-fiscali prima della decisione finale' using errcode = '22023';
    end if;
  else
    if not (coalesce(v_session.checks_completed, '[]'::jsonb) @> '["license","reports","inspection"]'::jsonb) then
      raise exception 'Completa tutte e tre le verifiche prima della decisione finale' using errcode = '22023';
    end if;
  end if;$new$;
BEGIN
  SELECT pg_get_functiondef('public.finish_traffic_control_session(uuid,uuid,text,text)'::regprocedure)
  INTO v_definition;

  IF position('["fiscal_docs","accounting","inventory"]' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected finish_traffic_control_session definition; refusing automatic patch';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
