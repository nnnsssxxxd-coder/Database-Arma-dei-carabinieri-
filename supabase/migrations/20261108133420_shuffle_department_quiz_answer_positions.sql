update public.department_questions d
set options = (
  select jsonb_agg(x.elem order by ((x.ord - 1 + s.offset) % 4))
  from jsonb_array_elements(d.options) with ordinality x(elem,ord)
), correct_index = s.offset
from (
  select id, ((sort_order + rank_band + ascii(substr(department_id,1,1))) % 4)::smallint as offset
  from public.department_questions
) s
where d.id=s.id;