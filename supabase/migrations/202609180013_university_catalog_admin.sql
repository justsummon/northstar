-- Adds data provenance for the expanded university catalog and a real admin
-- role for CRUD. Existing public-read university policy remains unchanged.
alter table public.universities
  add column if not exists website_url text,
  add column if not exists admissions_url text,
  add column if not exists data_source_url text,
  add column if not exists data_verified_at date;

alter table public.users
  add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.users
    where id=auth.uid() and role='admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.lock_user_role()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin')
     and current_setting('role',true) <> 'service_role' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger users_lock_role
before update on public.users
for each row execute procedure public.lock_user_role();

create policy "universities admin insert"
on public.universities for insert
with check (public.is_admin());

create policy "universities admin update"
on public.universities for update
using (public.is_admin())
with check (public.is_admin());

create policy "universities admin delete"
on public.universities for delete
using (public.is_admin());

-- Admin assignment is intentionally server-side only:
-- update public.users set role='admin' where email='owner@example.com';
