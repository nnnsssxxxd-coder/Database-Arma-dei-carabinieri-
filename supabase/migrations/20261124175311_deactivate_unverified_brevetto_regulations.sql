-- Keep the brevetto bank closed to generic placeholder items.
update public.vehicle_brevetto_question_bank
set active = false
where active = true
  and category = 'regulations'
  and (
    source_note ilike '%formulazione alternativa%'
    or length(trim(source_note)) < 30
  );