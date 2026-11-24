-- Award patrol EXP only when the operator chooses the correct action.
-- Wrong decisions still close and count the training scenario, but grant 0 EXP.
DO $migration$
DECLARE
  v_definition text;
  v_old text := 'v_correct := p_chosen_action = v_session.correct_action;';
  v_new text := 'v_correct := p_chosen_action = v_session.correct_action;' || E'\n  v_reward := case when v_correct then 10 else 0 end;';
BEGIN
  SELECT pg_get_functiondef('public.finish_traffic_control_session(uuid,uuid,text,text)'::regprocedure)
  INTO v_definition;

  IF position('v_reward := case when v_correct then 10 else 0 end;' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected finish_traffic_control_session definition; refusing automatic patch';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
