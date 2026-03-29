create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.screening_requests;
drop table if exists public.patient_applications;
drop table if exists public.clinicians;
drop table if exists public.profiles;
drop table if exists public.study_programs;

drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

create table public.study_programs (
  id text primary key default ('study-' || replace(gen_random_uuid()::text, '-', '')),
  slug text not null unique,
  title text not null,
  condition text not null,
  short_description text not null default '',
  description text not null default '',
  eligibility_summary text not null default '',
  requirements text not null default '',
  age_min integer not null check (age_min >= 18),
  age_max integer not null check (age_max >= age_min),
  location_label text not null default '',
  location_type text not null default 'hybrid' check (location_type in ('remote', 'hybrid', 'in_person')),
  medications_exclusions text not null default '',
  availability_requirements text not null default '',
  time_commitment text not null default '',
  study_type text not null default 'Clinical study',
  recruit_status text not null default 'open' check (recruit_status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('patient', 'clinician')),
  email text not null unique,
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  state text not null default '',
  site_name text not null default '',
  title text not null default '',
  created_at timestamptz not null default now()
);

create table public.clinicians (
  id text primary key default ('clinician-' || replace(gen_random_uuid()::text, '-', '')),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  title text not null,
  site_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.patient_applications (
  id text primary key default ('app-' || replace(gen_random_uuid()::text, '-', '')),
  study_id text not null references public.study_programs (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  age integer not null check (age between 18 and 120),
  city text not null,
  state text not null,
  phone text not null,
  email text not null,
  condition text not null default '',
  current_medications text not null default '',
  availability text not null default '',
  motivation text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'info_requested', 'eligible', 'not_eligible', 'scheduled_call')),
  clinician_notes text not null default '',
  scheduled_call_at text,
  scheduled_call_reason text not null default '',
  last_status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.screening_requests (
  id text primary key default ('req-' || replace(gen_random_uuid()::text, '-', '')),
  application_id text not null references public.patient_applications (id) on delete cascade,
  title text not null,
  body text not null,
  due_label text not null default 'No deadline',
  status text not null default 'open' check (status in ('open', 'responded', 'closed')),
  patient_response text not null default '',
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index patient_applications_study_id_idx
  on public.patient_applications (study_id);

create index patient_applications_email_idx
  on public.patient_applications (email);

create index patient_applications_auth_user_id_idx
  on public.patient_applications (auth_user_id);

create index screening_requests_application_id_idx
  on public.screening_requests (application_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger patient_applications_set_updated_at
before update on public.patient_applications
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text := coalesce(new.raw_user_meta_data ->> 'role', 'patient');
  next_full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  next_phone text := coalesce(new.raw_user_meta_data ->> 'phone', '');
  next_city text := coalesce(new.raw_user_meta_data ->> 'city', '');
  next_state text := coalesce(new.raw_user_meta_data ->> 'state', '');
  next_site_name text := coalesce(new.raw_user_meta_data ->> 'site_name', '');
  next_title text := coalesce(new.raw_user_meta_data ->> 'title', '');
begin
  insert into public.profiles (
    id,
    role,
    email,
    full_name,
    phone,
    city,
    state,
    site_name,
    title
  )
  values (
    new.id,
    next_role,
    coalesce(new.email, ''),
    next_full_name,
    next_phone,
    next_city,
    next_state,
    next_site_name,
    next_title
  )
  on conflict (id) do update
  set
    role = excluded.role,
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    city = excluded.city,
    state = excluded.state,
    site_name = excluded.site_name,
    title = excluded.title;

  if next_role = 'clinician' then
    insert into public.clinicians (
      id,
      auth_user_id,
      full_name,
      title,
      site_name,
      email
    )
    values (
      'clinician-' || replace(new.id::text, '-', ''),
      new.id,
      case when next_full_name = '' then 'New clinician' else next_full_name end,
      case when next_title = '' then 'Clinical Research Coordinator' else next_title end,
      case when next_site_name = '' then 'StudyPulse Research Network' else next_site_name end,
      coalesce(new.email, '')
    )
    on conflict (email) do update
    set
      auth_user_id = excluded.auth_user_id,
      full_name = excluded.full_name,
      title = excluded.title,
      site_name = excluded.site_name;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.study_programs enable row level security;
alter table public.profiles enable row level security;
alter table public.clinicians enable row level security;
alter table public.patient_applications enable row level security;
alter table public.screening_requests enable row level security;

create policy "study programs read"
  on public.study_programs
  for select
  using (true);

create policy "study programs insert"
  on public.study_programs
  for insert
  with check (true);

create policy "study programs update"
  on public.study_programs
  for update
  using (true)
  with check (true);

create policy "profiles read own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "clinicians read"
  on public.clinicians
  for select
  using (true);

create policy "clinicians write"
  on public.clinicians
  for all
  using (true)
  with check (true);

create policy "patient applications read"
  on public.patient_applications
  for select
  using (true);

create policy "patient applications insert"
  on public.patient_applications
  for insert
  with check (true);

create policy "patient applications update"
  on public.patient_applications
  for update
  using (true)
  with check (true);

create policy "screening requests read"
  on public.screening_requests
  for select
  using (true);

create policy "screening requests insert"
  on public.screening_requests
  for insert
  with check (true);

create policy "screening requests update"
  on public.screening_requests
  for update
  using (true)
  with check (true);

insert into public.study_programs (
  id,
  slug,
  title,
  condition,
  short_description,
  description,
  eligibility_summary,
  requirements,
  age_min,
  age_max,
  location_label,
  location_type,
  medications_exclusions,
  availability_requirements,
  time_commitment,
  study_type,
  recruit_status,
  created_at
)
values
  (
    'study-heart',
    'heartwell-remote-screening',
    'HeartWell Remote Screening Trial',
    'Heart palpitations and rhythm monitoring',
    'Hybrid trial for adults with recurring rhythm symptoms who can share wearable data.',
    'This study screens adults with recurring palpitations or irregular heart rhythm symptoms. Participants complete an intake review, a short eligibility call, and hybrid follow-ups.',
    'Adults 18-65 in Ohio or Kentucky with recurring heart-related symptoms.',
    'Participants should have recurring symptoms, reliable phone access, and availability for one screening call plus follow-up visits.',
    18,
    65,
    'Cincinnati clinic + remote follow-ups',
    'hybrid',
    'Some antiarrhythmic medications may require extra review.',
    'One 10-minute screening call and flexible weekday availability.',
    '1 intake call, 1 clinic visit, 2 remote check-ins',
    'Cardiology screening',
    'open',
    '2026-03-27T12:00:00.000Z'
  ),
  (
    'study-migraine',
    'calmwave-migraine-study',
    'CalmWave Migraine Prevention Study',
    'Migraines and recurring severe headaches',
    'Remote-first study evaluating preventive care patterns for adults with frequent migraines.',
    'This remote-first study is for adults experiencing frequent migraines who want to join a structured screening and follow-up program.',
    'Adults 18-55 with frequent migraines and reliable smartphone access.',
    'Participants should be able to complete remote questionnaires and one telehealth screening call.',
    18,
    55,
    'Remote participation',
    'remote',
    'Recent medication changes may require coordinator review.',
    'One telehealth screening call and weekly digital follow-ups.',
    '1 telehealth screening call, 4 weekly follow-ups',
    'Neurology screening',
    'open',
    '2026-03-26T09:00:00.000Z'
  );

insert into public.clinicians (
  id,
  auth_user_id,
  full_name,
  title,
  site_name,
  email,
  created_at
)
values (
  'clinician-lena',
  null,
  'Dr. Lena Patel',
  'Clinical Research Lead',
  'StudyPulse Research Network',
  'lena@studypulse.tech',
  '2026-03-27T12:00:00.000Z'
);

insert into public.patient_applications (
  id,
  study_id,
  auth_user_id,
  full_name,
  age,
  city,
  state,
  phone,
  email,
  condition,
  current_medications,
  availability,
  motivation,
  status,
  clinician_notes,
  scheduled_call_at,
  scheduled_call_reason,
  last_status_at,
  created_at,
  updated_at
)
values
  (
    'app-riley',
    'study-heart',
    null,
    'Riley Carter',
    24,
    'Cincinnati',
    'OH',
    '(513) 555-0142',
    'riley@demo.com',
    'Palpitations after exercise',
    'None currently',
    'Weekday evenings and Saturdays',
    'I want a structured screening path and I am comfortable sharing wearable data.',
    'info_requested',
    'Strong fit so far. Need one more history clarification before final eligibility call.',
    null,
    '',
    '2026-03-28T14:10:00.000Z',
    '2026-03-27T18:30:00.000Z',
    '2026-03-28T14:10:00.000Z'
  ),
  (
    'app-jordan',
    'study-heart',
    null,
    'Jordan Kim',
    29,
    'Lexington',
    'KY',
    '(859) 555-0197',
    'jordan@demo.com',
    'Post-COVID heart rate variability concerns',
    'Low-dose beta blocker',
    'Flexible after 1 PM',
    'Looking for a structured screening program and willing to do remote follow-ups.',
    'eligible',
    'Eligible. Schedule the consent call.',
    null,
    '',
    '2026-03-28T12:20:00.000Z',
    '2026-03-26T16:00:00.000Z',
    '2026-03-28T12:20:00.000Z'
  ),
  (
    'app-morgan',
    'study-migraine',
    null,
    'Morgan Lee',
    31,
    'Columbus',
    'OH',
    '(614) 555-0118',
    'morgan@demo.com',
    'Frequent migraines with aura',
    'Magnesium supplement',
    'Remote visits before work',
    'I want to better understand triggers and contribute to migraine research.',
    'under_review',
    '',
    null,
    '',
    '2026-03-28T15:45:00.000Z',
    '2026-03-28T09:15:00.000Z',
    '2026-03-28T15:45:00.000Z'
  );

insert into public.screening_requests (
  id,
  application_id,
  title,
  body,
  due_label,
  status,
  patient_response,
  responded_at,
  created_at
)
values
  (
    'req-riley-1',
    'app-riley',
    'Confirm symptom timing',
    'Please tell us when the palpitations usually happen, how long they last, and whether anything makes them better or worse.',
    'Due tonight',
    'open',
    '',
    null,
    '2026-03-28T13:45:00.000Z'
  ),
  (
    'req-riley-2',
    'app-riley',
    'Upload wearable summary',
    'Send your recent watch heart-rate summary so we can compare your symptoms against your baseline.',
    'Completed',
    'responded',
    'Uploaded screenshots from the last 7 days. The spikes mostly happen after basketball.',
    '2026-03-28T09:12:00.000Z',
    '2026-03-27T20:00:00.000Z'
  );
