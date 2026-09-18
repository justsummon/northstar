-- Adds structured annual cost and international-aid fields used by the
-- financial calculator. Ranges avoid presenting programme-dependent fees as
-- false precision; null continues to mean "verify with the university".
alter table public.universities
  add column if not exists tuition_annual_min numeric(12,2),
  add column if not exists tuition_annual_max numeric(12,2),
  add column if not exists living_cost_annual_min numeric(12,2),
  add column if not exists living_cost_annual_max numeric(12,2),
  add column if not exists cost_currency char(3),
  add column if not exists international_aid_policy text not null default 'unknown'
    check (international_aid_policy in ('need_blind','need_aware','merit_only','limited','none','unknown')),
  add column if not exists scholarships jsonb not null default '[]'::jsonb
    check (jsonb_typeof(scholarships) = 'array'),
  add column if not exists financial_aid_deadline date,
  add column if not exists financial_aid_url text;

alter table public.universities
  add constraint universities_tuition_range_check
    check (tuition_annual_min is null or tuition_annual_max is null or tuition_annual_min <= tuition_annual_max),
  add constraint universities_living_range_check
    check (living_cost_annual_min is null or living_cost_annual_max is null or living_cost_annual_min <= living_cost_annual_max);

-- Official 2026/27 MIT cost of attendance and international need-blind policy.
update public.universities
set tuition_annual_min=66720,
    tuition_annual_max=66720,
    living_cost_annual_min=26040,
    living_cost_annual_max=26040,
    cost_currency='USD',
    international_aid_policy='need_blind',
    scholarships='[{"name":"MIT Scholarship","type":"need-based","coverage":"Up to 100% of demonstrated need"}]'::jsonb,
    financial_aid_url='https://sfs.mit.edu/undergraduate-students/apply-for-aid/international/'
where name='Massachusetts Institute of Technology';

-- Official Oxford 2027/28 overseas fee and nine-month living-cost ranges.
update public.universities
set tuition_annual_min=39620,
    tuition_annual_max=66580,
    living_cost_annual_min=13275,
    living_cost_annual_max=19575,
    cost_currency='GBP',
    international_aid_policy='limited',
    financial_aid_url='https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding'
where name='University of Oxford';

-- Official HKU 2027/28 non-local STEM fee; living range combines hall and
-- published general living expenses. Exact housing choice changes the total.
update public.universities
set tuition_annual_min=280000,
    tuition_annual_max=280000,
    living_cost_annual_min=67290,
    living_cost_annual_max=87940,
    cost_currency='HKD',
    international_aid_policy='merit_only',
    scholarships='[{"name":"HKU Entrance Scholarships","type":"merit","coverage":"Tuition; some awards also include living expenses"}]'::jsonb,
    financial_aid_url='https://admissions.hku.hk/fees-and-scholarships/fees'
where name='The University of Hong Kong';

comment on column public.universities.tuition_annual_min is 'Published annual international tuition lower bound; null means programme-level verification is required.';
comment on column public.universities.scholarships is 'Public scholarship summary objects; users must verify eligibility and current deadlines at financial_aid_url.';
