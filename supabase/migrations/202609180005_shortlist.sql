-- Adds a private per-profile university shortlist. RLS mirrors the ownership
-- checks used by portfolio child tables so each improvement remains isolated.
create table public.shortlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(profile_id, university_id)
);

create index shortlist_profile_created_idx
  on public.shortlist(profile_id, created_at);

alter table public.shortlist enable row level security;

create policy "shortlist own" on public.shortlist for all
using (
  exists(
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);
