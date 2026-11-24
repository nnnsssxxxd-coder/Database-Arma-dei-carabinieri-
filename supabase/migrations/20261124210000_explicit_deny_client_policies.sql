-- Explicitly document that sensitive administrative, game and brevetto tables
-- are server-only. service_role bypasses RLS; browser clients remain denied.
do $$
declare t text;
begin
 foreach t in array array[
  'command_general_admins',
  'command_general_audit',
  'department_vehicle_brevetti',
  'department_vehicle_brevetto_attempts',
  'ministry_admin_audit',
  'ministry_admins',
  'traffic_control_sessions',
  'vehicle_brevetto_catalog',
  'vehicle_brevetto_cycles',
  'vehicle_brevetto_question_bank'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists deny_browser_client_access on public.%I',t);
  execute format('create policy deny_browser_client_access on public.%I for all to anon, authenticated using (false) with check (false)',t);
 end loop;
end $$;
