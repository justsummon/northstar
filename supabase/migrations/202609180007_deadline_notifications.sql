-- Tracks deadline reminder delivery so the same 7/3/1-day notification is
-- never shown or sent twice to the same user.
create table public.deadline_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  reminder_days smallint not null check (reminder_days in (1,3,7)),
  channel text not null default 'in_app' check (channel in ('in_app','email')),
  shown_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id, reminder_days, channel)
);

create index deadline_notifications_user_pending_idx
  on public.deadline_notifications(user_id, shown_at, created_at);

alter table public.deadline_notifications enable row level security;

create policy "deadline notifications own" on public.deadline_notifications for all
using (
  user_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())
)
with check (
  user_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())
  and exists(select 1 from public.calendar_events e where e.id=event_id and e.profile_id=profile_id)
);
