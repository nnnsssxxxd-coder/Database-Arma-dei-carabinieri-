-- Close the traffic cycle table exposed-schema policy gap and remove direct execution
-- of a trigger-only SECURITY DEFINER helper.
alter table public.traffic_control_cycles enable row level security;
revoke all on public.traffic_control_cycles from anon, authenticated, public;
drop policy if exists deny_browser_client_access on public.traffic_control_cycles;
create policy deny_browser_client_access
  on public.traffic_control_cycles
  for all to anon, authenticated
  using (false) with check (false);

revoke all on function public.track_traffic_control_completion() from public, anon, authenticated;
