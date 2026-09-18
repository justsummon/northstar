create extension if not exists "pgcrypto";

create type public.activity_tier as enum ('1','2','3','4');
create type public.admission_type as enum ('reach','match','safety');
create type public.calendar_event_type as enum ('deadline','interview','task','exam');
create type public.calendar_event_source as enum ('manual','auto_financial_aid','auto_ai_roadmap');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  auth_provider text not null default 'email',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  full_name text not null default '',
  school text not null default '',
  city text not null default '',
  country text not null default '',
  grade smallint check (grade between 9 and 12),
  target_major text not null default '',
  gpa_unweighted numeric(4,2),
  gpa_weighted numeric(4,2),
  gpa_scale numeric(5,2) not null default 4,
  english_exam_type text,
  english_score numeric(6,2),
  sat smallint check (sat between 400 and 1600),
  act smallint check (act between 1 and 36),
  ent_unt smallint,
  nuet smallint,
  interview_ready boolean not null default false,
  annual_budget numeric(12,2),
  currency char(3) not null default 'USD',
  needs_full_aid boolean not null default false,
  portfolio_public boolean not null default false,
  target_countries text[] not null default '{}',
  narrative_about_me text not null default '',
  is_demo boolean not null default false,
  leaderboard_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ap_exams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  score smallint not null check (score between 1 and 5)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tier public.activity_tier not null default '4',
  hours_per_week numeric(5,1) not null default 1 check (hours_per_week >= 0 and hours_per_week <= 168),
  description text not null default ''
);

create table public.olympiads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  level text not null,
  result text not null
);

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null,
  region text not null,
  city text not null,
  qs_rank smallint,
  admission_type public.admission_type not null,
  acceptance_rate numeric(5,2),
  gpa_requirement numeric(4,2),
  other_requirements jsonb not null default '{}'::jsonb,
  logo_url text,
  average_admitted_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  date date not null,
  type public.calendar_event_type not null,
  description text not null default '',
  source public.calendar_event_source not null default 'manual',
  created_at timestamptz not null default now(),
  unique(profile_id, title, date, source)
);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  holistic_score numeric(5,2) not null,
  academics_score numeric(5,2) not null,
  extracurriculars_score numeric(5,2) not null,
  awards_score numeric(5,2) not null,
  test_scores_score numeric(5,2) not null,
  coherence_notes text not null,
  spike_alignment_notes text not null,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_leaderboard_idx on public.profiles (leaderboard_score desc) where portfolio_public;
create index activities_profile_idx on public.activities(profile_id);
create index olympiads_profile_idx on public.olympiads(profile_id);
create index calendar_events_profile_date_idx on public.calendar_events(profile_id, date);
create index ai_evaluations_profile_idx on public.ai_evaluations(profile_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id,email,auth_provider)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_app_meta_data->>'provider','email'));
  insert into public.profiles(user_id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute procedure public.touch_updated_at();

create or replace function public.add_financial_aid_deadlines(target_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = target_profile_id and user_id = auth.uid();
  if p.id is null or not p.needs_full_aid then return; end if;
  if p.target_countries && array['USA','US'] then
    insert into public.calendar_events(profile_id,title,date,type,description,source) values
      (p.id,'CSS Profile priority deadline',make_date(extract(year from current_date)::int + 1,1,15),'deadline','Подать CSS Profile и проверить список документов каждого вуза.','auto_financial_aid'),
      (p.id,'ISFAA deadline',make_date(extract(year from current_date)::int + 1,2,1),'deadline','Подготовить ISFAA для вузов, которые не принимают CSS Profile.','auto_financial_aid')
    on conflict do nothing;
  end if;
  insert into public.calendar_events(profile_id,title,date,type,description,source)
  values(p.id,'Financial Aid Priority Deadline',make_date(extract(year from current_date)::int + 1,2,15),'deadline','Сверить индивидуальный priority deadline выбранных вузов.','auto_financial_aid')
  on conflict do nothing;
end;
$$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.ap_exams enable row level security;
alter table public.activities enable row level security;
alter table public.olympiads enable row level security;
alter table public.universities enable row level security;
alter table public.calendar_events enable row level security;
alter table public.ai_evaluations enable row level security;

create policy "users read own" on public.users for select using (id = auth.uid());
create policy "users update own" on public.users for update using (id = auth.uid());
create policy "profiles read own or public demo" on public.profiles for select using (user_id = auth.uid() or (is_demo and portfolio_public));
create policy "profiles update own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (user_id = auth.uid());
create policy "universities public read" on public.universities for select using (true);

create policy "ap own" on public.ap_exams for all using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "activities own" on public.activities for all using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "olympiads own" on public.olympiads for all using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "calendar own" on public.calendar_events for all using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "evaluations own" on public.ai_evaluations for all using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));

grant execute on function public.add_financial_aid_deadlines(uuid) to authenticated;
