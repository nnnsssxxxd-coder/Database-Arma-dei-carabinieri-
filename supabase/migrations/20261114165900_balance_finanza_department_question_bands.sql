
-- Keep the same balanced 33/33/34 question rotation used by the Carabinieri career paths.
with ranked as (
  select dq.id,
         row_number() over (
           partition by dq.department_id
           order by case lower(q.difficulty) when 'base' then 0 when 'intermedio' then 1 else 2 end,
                    q.sort_order,q.id
         ) as rn
  from public.department_questions dq
  join public.quiz_questions q
    on q.prompt=dq.prompt and q.service_branch='finanza' and q.active=true
  where dq.service_branch='finanza'
    and dq.department_id in (
      'gdf_scico','gdf_gico','gdf_polizia_valutaria','gdf_tutela_entrate',
      'gdf_spesa_pubblica','gdf_anticorruzione','gdf_privacy_frodi',
      'gdf_beni_servizi','gdf_antitrust','gdf_atpi','gdf_aeronavale'
    )
)
update public.department_questions dq
set rank_band=case when ranked.rn<=33 then 0 when ranked.rn<=66 then 1 else 2 end
from ranked
where dq.id=ranked.id and dq.service_branch='finanza';
