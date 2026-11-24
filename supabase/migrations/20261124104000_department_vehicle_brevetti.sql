create table if not exists public.department_vehicle_brevetti (
  user_id uuid not null references auth.users(id) on delete cascade,
  service_branch text not null check (service_branch in ('carabinieri','finanza')),
  department_id text not null check (department_id ~ '^[a-z0-9_-]{2,32}$'),
  vehicle_id text not null check (vehicle_id ~ '^[a-z0-9_-]{2,64}$'),
  vehicle_name text not null check (char_length(vehicle_name) between 5 and 120),
  vehicle_type text not null check (vehicle_type in ('4x4','suv','van','berlina','barca','moto')),
  selected_at timestamptz not null default now(),
  primary key (user_id, service_branch)
);
create index if not exists department_vehicle_brevetti_department_idx
  on public.department_vehicle_brevetti(service_branch, department_id);
alter table public.department_vehicle_brevetti enable row level security;
revoke all on public.department_vehicle_brevetti from public, anon, authenticated;
grant all on public.department_vehicle_brevetti to service_role;
