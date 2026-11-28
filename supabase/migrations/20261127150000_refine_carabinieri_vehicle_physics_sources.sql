-- Replace abbreviated/private physics references in the Carabinieri vehicle banks
-- with verified NASA and university-level OpenStax/UCF sources.
-- The exact row-count guard prevents a partial or mis-targeted backfill.
begin;

do $$
declare
  v_inertia_count integer;
  v_curve_count integer;
  v_energy_count integer;
  v_momentum_count integer;
  v_incline_count integer;
begin
  select count(*) into v_inertia_count
  from public.vehicle_brevetto_question_bank
  where active and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt='Che cosa indica l’inerzia di un veicolo?';

  select count(*) into v_curve_count
  from public.vehicle_brevetto_question_bank
  where active and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt in (
      'In curva, quale fattore aumenta la richiesta di aderenza laterale?',
      'A parità di raggio di curva, come varia l’accelerazione centripeta se la velocità aumenta del 50%?',
      'Che cosa succede alla forza laterale necessaria in curva se il raggio si dimezza mantenendo la velocità?'
    );

  select count(*) into v_energy_count
  from public.vehicle_brevetto_question_bank
  where active and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt in (
      'Nel modello ideale, se la velocità raddoppia, come varia l’energia cinetica?',
      'Perché un veicolo più pesante richiede più energia per raggiungere la stessa velocità?'
    );

  select count(*) into v_momentum_count
  from public.vehicle_brevetto_question_bank
  where active and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt='Che cosa rappresenta la quantità di moto di un veicolo?';

  select count(*) into v_incline_count
  from public.vehicle_brevetto_question_bank
  where active and category='physics'
    and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
    and prompt='Che cosa accade alla componente del peso che agisce lungo una salita più ripida?';

  if v_inertia_count<>4 or v_curve_count<>12 or v_energy_count<>8
     or v_momentum_count<>4 or v_incline_count<>4 then
    raise exception 'Backfill fisica Carabinieri non applicabile: attesi 4 inerzia, 12 curva, 8 energia, 4 quantità di moto e 4 piano inclinato; trovati %, %, %, %, %.',
      v_inertia_count,v_curve_count,v_energy_count,v_momentum_count,v_incline_count;
  end if;
end $$;

update public.vehicle_brevetto_question_bank
set source_url='https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/',
    source_note='NASA Glenn, Newton’s First Law: un corpo resiste ai cambiamenti del proprio stato di moto finché non agisce una forza esterna risultante.'
where active and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt='Che cosa indica l’inerzia di un veicolo?';

update public.vehicle_brevetto_question_bank
set source_url='https://pressbooks.online.ucf.edu/phy2053bc/chapter/centripetal-acceleration/',
    source_note='University of Central Florida, College Physics §6.2: a_c = v²/r; la velocità al quadrato e il raggio della curva determinano l’accelerazione centripeta e la richiesta di forza laterale.'
where active and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt in (
    'In curva, quale fattore aumenta la richiesta di aderenza laterale?',
    'A parità di raggio di curva, come varia l’accelerazione centripeta se la velocità aumenta del 50%?',
    'Che cosa succede alla forza laterale necessaria in curva se il raggio si dimezza mantenendo la velocità?'
  );

update public.vehicle_brevetto_question_bank
set source_url='https://pressbooks.online.ucf.edu/phy2053bc/chapter/kinetic-energy-and-the-work-energy-theorem/',
    source_note='University of Central Florida, College Physics §7.2: l’energia cinetica traslazionale è KE = 1/2 mv²; dipende linearmente dalla massa e dal quadrato della velocità.'
where active and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt in (
    'Nel modello ideale, se la velocità raddoppia, come varia l’energia cinetica?',
    'Perché un veicolo più pesante richiede più energia per raggiungere la stessa velocità?'
  );

update public.vehicle_brevetto_question_bank
set source_url='https://pressbooks.online.ucf.edu/phy2053bc/chapter/linear-momentum-and-force/',
    source_note='University of Central Florida, College Physics §8.1: la quantità di moto lineare è p = mv, grandezza vettoriale proporzionale a massa e velocità.'
where active and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt='Che cosa rappresenta la quantità di moto di un veicolo?';

update public.vehicle_brevetto_question_bank
set source_url='https://pressbooks.online.ucf.edu/phy2053bc/chapter/friction/',
    source_note='University of Central Florida, College Physics §5.1: su un piano inclinato la componente del peso lungo il piano è mg sin θ e aumenta al crescere dell’angolo.'
where active and category='physics'
  and vehicle_id in ('cc-defender-110','cc-iveco-50c17-op','cc-jeep-wrangler','cc-subaru-crosstrek')
  and prompt='Che cosa accade alla componente del peso che agisce lungo una salita più ripida?';

commit;
