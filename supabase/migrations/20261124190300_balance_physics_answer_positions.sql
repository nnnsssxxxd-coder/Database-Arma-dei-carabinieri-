-- Deterministically distribute correct-answer positions across the physics bank.
-- Keep each option set and its answer key paired while changing only display order.
with reordered as (
  select q.id,
         jsonb_agg(x.option order by md5(q.vehicle_id||'|'||q.prompt||'|'||x.ord::text)) as new_options,
         (array_position(
            array_agg(x.ord order by md5(q.vehicle_id||'|'||q.prompt||'|'||x.ord::text)),
            q.correct_index+1
          )-1)::smallint as new_correct_index
  from public.vehicle_brevetto_question_bank q
  cross join lateral jsonb_array_elements(q.options) with ordinality as x(option,ord)
  where q.active=true and q.category='physics'
  group by q.id
)
update public.vehicle_brevetto_question_bank q
set options=r.new_options,correct_index=r.new_correct_index
from reordered r
where q.id=r.id
  and (q.options is distinct from r.new_options or q.correct_index is distinct from r.new_correct_index);
