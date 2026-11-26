DO $migration$
DECLARE
  v_definition text;
  v_old text := $old$
 select initial_rank into v_initial from public.profile_memberships
  where user_id=p_user_id and service_branch=a.service_branch and active=true;
 if not found then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;
$old$;
  v_new text := $new$
 select m.initial_rank into v_initial
  from public.profile_memberships m
  join public.profiles p on p.id=m.user_id
  where m.user_id=p_user_id
    and m.service_branch=a.service_branch
    and m.active=true
    and p.active=true
    and p.deleted=false;
 if not found then raise exception 'Account non abilitato per il Corpo' using errcode='42501'; end if;
$new$;
BEGIN
  SELECT pg_get_functiondef('public.complete_rank_exam(uuid,uuid,jsonb)'::regprocedure)
  INTO v_definition;

  IF position('p.deleted=false' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected complete_rank_exam definition; refusing automatic patch';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
