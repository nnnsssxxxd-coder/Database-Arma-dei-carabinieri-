-- Verified vehicle catalogue and isolated question-bank schema.
create table if not exists public.vehicle_brevetto_catalog (
  id text primary key,
  service_branch text not null check (service_branch in ('carabinieri','finanza')),
  display_name text not null,
  vehicle_domain text not null check (vehicle_domain in ('land','naval','air')),
  description text not null default '',
  source_url text not null,
  source_checked_at date not null default current_date,
  active boolean not null default true,
  sort_order smallint not null default 0,
  unique(service_branch, display_name)
);
create table if not exists public.vehicle_brevetto_question_bank (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text not null references public.vehicle_brevetto_catalog(id) on delete cascade,
  prompt text not null check (length(prompt) between 10 and 700),
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null default '',
  source_url text not null,
  source_note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_brevetto_questions_active_idx on public.vehicle_brevetto_question_bank(vehicle_id,active);
alter table public.department_vehicle_brevetti alter column department_id drop not null;
alter table public.department_vehicle_brevetto_attempts alter column department_id drop not null;
alter table public.vehicle_brevetto_catalog enable row level security;
alter table public.vehicle_brevetto_question_bank enable row level security;
revoke all on public.vehicle_brevetto_catalog, public.vehicle_brevetto_question_bank from anon, authenticated;
grant select,insert,update,delete on public.vehicle_brevetto_catalog, public.vehicle_brevetto_question_bank to service_role;
insert into public.vehicle_brevetto_catalog(id,service_branch,display_name,vehicle_domain,description,source_url,sort_order) values
('cc-subaru-crosstrek','carabinieri','Subaru Crosstrek 4x4','land','Veicolo 4x4 documentato negli atti ufficiali di approvvigionamento dell’Arma.','https://www.carabinieri.it/in-vostro-aiuto/amm-trasp/gare-appalto/gare-appalto/cg_dirapp_1507_6_5_2026',1),
('cc-iveco-50c17-op','carabinieri','IVECO 50 C17 O.P.','land','Veicolo operativo documentato negli atti ufficiali di manutenzione dell’Arma.','https://www.carabinieri.it/docs/default-source/gareappalto/2025/leg_sicilia_68_227-33_2025.pdf',2),
('cc-defender-110','carabinieri','Land Rover Defender 110','land','Modello presente negli elenchi ufficiali dei veicoli dell’Arma.','https://www.carabinieri.it/docs/default-source/gareappalto/2026/a04_leg_toscana_205_2026-valori-massimi-all-a.pdf',3),
('cc-jeep-wrangler','carabinieri','Jeep Wrangler','land','Modello presente negli elenchi ufficiali dei veicoli dell’Arma.','https://www.carabinieri.it/docs/default-source/gareappalto/2026/a04_leg_toscana_205_2026-valori-massimi-all-a.pdf',4),
('gdf-classe-monti','finanza','Pattugliatore classe Monti','naval','Pattugliatore multiruolo; 28 nodi e autonomia dichiarata di 2.000 miglia a 18 nodi.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/specializzazioni/servizio-navale-polizia-del-mare/chi-siamo/flotta-navale/unita-navali-operative/pattugliatore/pattugliatore-classe-monti',1),
('gdf-classe-di-bartolo','finanza','Pattugliatore veloce classe Di Bartolo','naval','Classe con velocità massima dichiarata di 35 nodi e autonomia di 1.290 miglia a 15 nodi.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/specializzazioni/servizio-navale-polizia-del-mare/chi-siamo/flotta-navale/unita-navali-operative/pattugliatore-veloce/pattugliatore-veloce-classe-di-bartolo',2),
('gdf-classe-bigliani-viii','finanza','Guardacoste classe Bigliani VIII serie','naval','Unità navali operative descritte nella struttura del Servizio Navale.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/specializzazioni/servizio-navale-polizia-del-mare/reparti/puglia/stazione-navale-di-manovra-taranto/ordinamento-e-unita-navali-dipendenti',3),
('gdf-bso-139','finanza','Battello B.S.O. 139','naval','Battello operativo di 11 metri, due fuoribordo da 400 HP, oltre 40 nodi.','https://www.gdf.gov.it/it/chi-siamo/organizzazione/specializzazioni/servizio-navale-polizia-del-mare/notizie-ed-eventi/notizie-servizio-navale/anno-2026/potenziata-la-dotazione-di-mezzi-della-2a-squadra-unita-navali-di-vieste-con-lassegnazione-di-un-nuovo-battello-operativo',4)
on conflict(id) do update set display_name=excluded.display_name,vehicle_domain=excluded.vehicle_domain,description=excluded.description,source_url=excluded.source_url,source_checked_at=current_date,active=true,sort_order=excluded.sort_order;
