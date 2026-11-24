-- Both personnel ladders contain 24 official grades indexed from 0 to 23.
alter table public.profile_memberships
 drop constraint if exists profile_memberships_initial_rank_check;
alter table public.profile_memberships
 add constraint profile_memberships_initial_rank_check
 check (initial_rank >= 0 and initial_rank <= 23);
alter table public.profiles
 drop constraint if exists profiles_initial_rank_check;
alter table public.profiles
 add constraint profiles_initial_rank_check
 check (initial_rank >= 0 and initial_rank <= 23);
