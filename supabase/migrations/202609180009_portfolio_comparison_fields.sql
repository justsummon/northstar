-- Adds structured comparison metrics and portfolio context fields.
-- Existing rows remain valid: all new columns are nullable and the existing
-- other_requirements JSON is preserved for program-specific requirements.
alter table public.universities
  add column if not exists sat_requirement smallint,
  add column if not exists sat_average smallint,
  add column if not exists act_requirement smallint,
  add column if not exists act_average smallint,
  add column if not exists nuet_requirement smallint,
  add column if not exists nuet_average smallint,
  add column if not exists application_deadline date;

alter table public.profiles
  add column if not exists ib_score smallint,
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists recommendation_letters jsonb not null default '[]'::jsonb,
  add column if not exists financial_notes text not null default '';

alter table public.universities
  add constraint universities_sat_requirement_check
    check (sat_requirement is null or sat_requirement between 400 and 1600),
  add constraint universities_sat_average_check check (sat_average is null or sat_average between 400 and 1600),
  add constraint universities_act_requirement_check
    check (act_requirement is null or act_requirement between 1 and 36),
  add constraint universities_act_average_check check (act_average is null or act_average between 1 and 36),
  add constraint universities_nuet_requirement_check
    check (nuet_requirement is null or nuet_requirement between 0 and 240),
  add constraint universities_nuet_average_check check (nuet_average is null or nuet_average between 0 and 240);
