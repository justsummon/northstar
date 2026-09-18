-- Turns calendar events into stable roadmap stages with dated subtasks and an
-- auditable change log. The stable roadmap_key lets regeneration update a stage
-- in place instead of creating a duplicate whenever its calculated date changes.
alter table public.calendar_events
  add column if not exists roadmap_key text;

alter table public.calendar_events
  add constraint calendar_events_profile_roadmap_key_key
  unique(profile_id, roadmap_key);

create table public.roadmap_subtasks (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete cascade,
  title text not null,
  due_date date not null,
  completed boolean not null default false,
  estimated_minutes integer not null default 30 check (estimated_minutes between 5 and 1440),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(calendar_event_id, title)
);

create table public.roadmap_event_history (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete cascade,
  field_name text not null check (field_name in ('date','title','description','completed')),
  old_value text,
  new_value text,
  reason text not null default 'Этап изменён пользователем',
  created_at timestamptz not null default now()
);

create index roadmap_subtasks_event_date_idx
  on public.roadmap_subtasks(calendar_event_id, due_date, sort_order);

create index roadmap_event_history_event_created_idx
  on public.roadmap_event_history(calendar_event_id, created_at desc);

create trigger roadmap_subtasks_touch_updated_at
before update on public.roadmap_subtasks
for each row execute procedure public.touch_updated_at();

create or replace function public.record_roadmap_event_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  change_reason text := coalesce(
    new.metadata->>'change_reason',
    case when new.source='auto_ai_roadmap' then 'Roadmap пересчитан от дедлайна вуза'
         else 'Этап изменён пользователем'
    end
  );
begin
  if new.date is distinct from old.date then
    insert into public.roadmap_event_history(calendar_event_id,field_name,old_value,new_value,reason)
    values(new.id,'date',old.date::text,new.date::text,change_reason);
  end if;
  if new.title is distinct from old.title then
    insert into public.roadmap_event_history(calendar_event_id,field_name,old_value,new_value,reason)
    values(new.id,'title',old.title,new.title,change_reason);
  end if;
  if new.description is distinct from old.description then
    insert into public.roadmap_event_history(calendar_event_id,field_name,old_value,new_value,reason)
    values(new.id,'description',old.description,new.description,change_reason);
  end if;
  if new.completed is distinct from old.completed then
    insert into public.roadmap_event_history(calendar_event_id,field_name,old_value,new_value,reason)
    values(new.id,'completed',old.completed::text,new.completed::text,change_reason);
  end if;
  return new;
end;
$$;

create trigger calendar_events_record_roadmap_change
after update of date,title,description,completed on public.calendar_events
for each row execute procedure public.record_roadmap_event_change();

alter table public.roadmap_subtasks enable row level security;
alter table public.roadmap_event_history enable row level security;

create policy "roadmap subtasks own"
on public.roadmap_subtasks
for all
using (
  exists(
    select 1
    from public.calendar_events event
    join public.profiles profile on profile.id=event.profile_id
    where event.id=calendar_event_id and profile.user_id=auth.uid()
  )
)
with check (
  exists(
    select 1
    from public.calendar_events event
    join public.profiles profile on profile.id=event.profile_id
    where event.id=calendar_event_id and profile.user_id=auth.uid()
  )
);

create policy "roadmap history own read"
on public.roadmap_event_history
for select
using (
  exists(
    select 1
    from public.calendar_events event
    join public.profiles profile on profile.id=event.profile_id
    where event.id=calendar_event_id and profile.user_id=auth.uid()
  )
);

grant select,insert,update,delete on public.roadmap_subtasks to authenticated;
grant select on public.roadmap_event_history to authenticated;

-- This migration fixes duplicate stages during recalculation and makes every
-- roadmap date change explainable without changing existing RLS policies.
