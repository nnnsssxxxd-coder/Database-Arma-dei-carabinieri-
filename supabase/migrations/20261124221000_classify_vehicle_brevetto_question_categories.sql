alter table public.vehicle_brevetto_question_bank
  add column if not exists category text;

update public.vehicle_brevetto_question_bank
set category = case
  when source_note in (
    'Aderenza e distanza di arresto','Baricentro e stabilità del veicolo',
    'Dinamica longitudinale e trasferimento di carico','Forza centripeta',
    'Legge d’inerzia','Pneumatici e comportamento dinamico',
    'Relazione velocità-spazio di frenata','Stabilità laterale e trasferimento di carico',
    'Centro di gravità e stabilità della nave','Definizioni di stabilità navale',
    'Dinamica di manovra e stabilità','Distribuzione dei pesi e sbandamento',
    'Metacentro e stabilità iniziale','Principio di Archimede e dislocamento',
    'Resistenza idrodinamica','Volume immerso e spinta idrostatica'
  ) then 'physics'
  when source_note ilike '%normativ%' then 'regulations'
  else 'technical'
end
where category is null;

alter table public.vehicle_brevetto_question_bank
  alter column category set not null;
alter table public.vehicle_brevetto_question_bank
  drop constraint if exists vehicle_brevetto_question_bank_category_check;
alter table public.vehicle_brevetto_question_bank
  add constraint vehicle_brevetto_question_bank_category_check
  check (category in ('physics','technical','regulations'));
create index if not exists vehicle_brevetto_questions_category_idx
  on public.vehicle_brevetto_question_bank(vehicle_id,category,active);
