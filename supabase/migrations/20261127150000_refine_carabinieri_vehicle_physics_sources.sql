-- Replace abbreviated physics references in the existing Carabinieri vehicle banks
-- with institutional/academic sources and question-specific citation notes.
begin;

do $$
declare
  v_inertia_count integer;
  v_curve_count integer;
begin
  select count(*) into v_inertia_count
  from public.vehicle_brevetto_question_bank
  where active
    and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt='Che cosa indica l’inerzia di un veicolo?';

  select count(*) into v_curve_count
  from public.vehicle_brevetto_question_bank
  where active
    and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt='In curva, quale fattore aumenta la richiesta di aderenza laterale?';

  if v_inertia_count<>4 or v_curve_count<>4 then
    raise exception 'Backfill fonti fisica Carabinieri non applicabile: attese 4 domande inerzia e 4 domande curva, trovate % e %.',v_inertia_count,v_curve_count;
  end if;
end $$;

update public.vehicle_brevetto_question_bank
set source_url='https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/',
    source_note='NASA Glenn, Newton’s First Law: un corpo resiste ai cambiamenti del proprio stato di moto finché non agisce una forza esterna risultante.'
where active
  and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt='Che cosa indica l’inerzia di un veicolo?';

update public.vehicle_brevetto_question_bank
set source_url='https://pressbooks.online.ucf.edu/phy2053bc/chapter/centripetal-acceleration/',
    source_note='University of Central Florida, College Physics §6.2: a_c = v²/r; a raggio costante, raddoppiare la velocità quadruplica l’accelerazione centripeta.'
where active
  and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt='In curva, quale fattore aumenta la richiesta di aderenza laterale?';

commit;
