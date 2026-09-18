-- Audit fix #2: real and seeded profiles with portfolio_public=true are visible
-- in the leaderboard, but private GPA, budget, tests and narrative columns are
-- not exposed through a broad profiles SELECT policy. A narrow RPC returns only
-- the five fields needed by the UI plus a non-sensitive total count.
drop policy if exists "profiles read own or public demo" on public.profiles;
drop policy if exists "profiles read own or public" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;

create policy "profiles read own"
on public.profiles
for select
using (user_id = auth.uid());

create or replace function public.get_public_leaderboard(result_limit integer default 10)
returns table (
  full_name text,
  school text,
  country text,
  target_major text,
  leaderboard_score numeric,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.full_name,
    p.school,
    p.country,
    p.target_major,
    p.leaderboard_score,
    count(*) over() as total_count
  from public.profiles p
  where p.portfolio_public = true
  order by p.leaderboard_score desc nulls last
  limit least(greatest(coalesce(result_limit, 10), 1), 100);
$$;

revoke all on function public.get_public_leaderboard(integer) from public;
grant execute on function public.get_public_leaderboard(integer) to authenticated;
