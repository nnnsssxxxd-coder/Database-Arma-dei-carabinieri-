-- Disable placeholder regulation questions until they are replaced by individually sourced items.
-- The brevetto engine intentionally fails closed unless each vehicle has exactly
-- 30 physics, 40 vehicle-specific technical, and 30 applicable regulation questions.
update public.vehicle_brevetto_question_bank
set active = false
where active = true
  and category = 'regulations'
  and (
    source_note ilike '%formulazione alternativa%'
    or length(trim(source_note)) < 30
  );
