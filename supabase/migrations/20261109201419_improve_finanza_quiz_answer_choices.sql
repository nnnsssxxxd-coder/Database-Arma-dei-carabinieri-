with base as (
 select id,category,options->>correct_index as correct_text
 from public.quiz_questions
 where service_branch='finanza' and sort_order>=28 and active
), choice_rows as (
 select b.id,b.correct_text as option_text,true as is_correct,md5(b.id::text||':correct') as ordering
 from base b
 union all
 select b.id,d.correct_text,false,md5(b.id::text||':'||d.id::text)
 from base b
 cross join lateral (
  select distinct on (x.correct_text) x.id,x.correct_text
  from (
   select q.id,q.options->>q.correct_index as correct_text
   from public.quiz_questions q
   where q.service_branch='finanza' and q.active and q.id<>b.id
     and q.category=b.category
     and q.options->>q.correct_index<>b.correct_text
  ) x
  order by x.correct_text,md5(b.id::text||':'||x.id::text)
  limit 3
 ) d
), numbered as (
 select id,option_text,is_correct,row_number() over(partition by id order by ordering)-1 as option_index,ordering
 from choice_rows
), aggregated as (
 select id,jsonb_agg(option_text order by ordering) as options,
        min(option_index) filter(where is_correct) as correct_index
 from numbered group by id
)
update public.quiz_questions q
set options=a.options,correct_index=a.correct_index
from aggregated a
where q.id=a.id;