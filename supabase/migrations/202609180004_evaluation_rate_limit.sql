-- Audit fix #3: persist one row per completed AI evaluation so the Edge
-- Function can enforce a per-profile daily limit before calling the paid LLM.
create table public.evaluation_calls (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  called_at timestamptz not null default now()
);

create index evaluation_calls_profile_called_idx
on public.evaluation_calls(profile_id, called_at desc);

alter table public.evaluation_calls enable row level security;

create policy "evaluation calls select own"
on public.evaluation_calls
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);

create policy "evaluation calls insert own"
on public.evaluation_calls
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);
