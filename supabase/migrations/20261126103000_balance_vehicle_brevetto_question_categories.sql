-- Ensure every eight-question brevetto attempt covers all three required areas.
-- The bank remains 30 physics, 40 technical and 30 applicable regulations.
DO $migration$
DECLARE
  v_definition text;
  v_old text := $old$  with picked as (
    select id,prompt,options,correct_index,explanation,source_url
    from public.vehicle_brevetto_question_bank
    where vehicle_id = p_vehicle_id
      and active = true
      and not (id = any(coalesce(v_cycle.used_question_ids,'{}'::uuid[])))
    order by random()
    limit 8
  ),
  ordered as (
    select *, row_number() over (order by random()) as ord
    from picked
  )
  select
    array_agg(id order by ord),
    jsonb_agg(
      jsonb_build_array(prompt) || options ||
      jsonb_build_array(correct_index,explanation,source_url)
      order by ord
    )
  into v_ids,v_questions
  from ordered;$old$;
  v_new text := $new$  with picked as (
    (select id,prompt,options,correct_index,explanation,source_url
     from public.vehicle_brevetto_question_bank
     where vehicle_id = p_vehicle_id and active = true
       and category = 'physics'
       and not (id = any(coalesce(v_cycle.used_question_ids,'{}'::uuid[])))
     order by random() limit 2)
    union all
    (select id,prompt,options,correct_index,explanation,source_url
     from public.vehicle_brevetto_question_bank
     where vehicle_id = p_vehicle_id and active = true
       and category = 'technical'
       and not (id = any(coalesce(v_cycle.used_question_ids,'{}'::uuid[])))
     order by random() limit 3)
    union all
    (select id,prompt,options,correct_index,explanation,source_url
     from public.vehicle_brevetto_question_bank
     where vehicle_id = p_vehicle_id and active = true
       and category = 'regulations'
       and not (id = any(coalesce(v_cycle.used_question_ids,'{}'::uuid[])))
     order by random() limit 3)
  ),
  ordered as (
    select *, row_number() over (order by random()) as ord
    from picked
  )
  select
    array_agg(id order by ord),
    jsonb_agg(
      jsonb_build_array(prompt) || options ||
      jsonb_build_array(correct_index,explanation,source_url)
      order by ord
    )
  into v_ids,v_questions
  from ordered;$new$;
BEGIN
  SELECT pg_get_functiondef('public.start_vehicle_brevetto_attempt(uuid,text,text)'::regprocedure)
  INTO v_definition;

  IF position('category = ''physics''' IN v_definition) > 0
     AND position('category = ''technical''' IN v_definition) > 0
     AND position('category = ''regulations''' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected start_vehicle_brevetto_attempt definition; refusing automatic patch';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
