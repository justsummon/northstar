-- Audit fix #1: authenticated clients may update their profile, but system-owned
-- provenance and leaderboard columns must only change through the service role.
create or replace function public.lock_protected_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('role', true), '') <> 'service_role' then
    new.is_demo := old.is_demo;
    new.leaderboard_score := old.leaderboard_score;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_protected_columns on public.profiles;
create trigger profiles_lock_protected_columns
before update on public.profiles
for each row execute procedure public.lock_protected_profile_columns();

-- Verification after applying this migration:
-- set local role authenticated;
-- update public.profiles set leaderboard_score = 100 where user_id = auth.uid();
-- The UPDATE succeeds, while leaderboard_score remains unchanged.
