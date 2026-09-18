-- Stores roadmap completion and user edits in the same calendar_events rows.
-- Existing generated/manual events remain incomplete and keep their source.
alter table public.calendar_events
  add column if not exists completed boolean not null default false;

alter table public.calendar_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;
