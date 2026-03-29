create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.screening_requests;
drop table if exists public.patient_applications;
drop table if exists public.clinicians;
drop table if exists public.profiles;
drop table if exists public.study_programs;

drop function if exists public.handle_new_user();
drop function if exists public.bootstrap_profile();
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

create or replace function public.bootstrap_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  claims jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  metadata jsonb := coalesce(claims -> 'user_metadata', '{}'::jsonb);
  next_role text := coalesce(metadata ->> 'role', 'patient');
  next_email text := coalesce(claims ->> 'email', '');
  next_full_name text := coalesce(metadata ->> 'full_name', '');
  next_phone text := coalesce(metadata ->> 'phone', '');
  next_city text := coalesce(metadata ->> 'city', '');
  next_state text := coalesce(metadata ->> 'state', '');
  next_site_name text := coalesce(metadata ->> 'site_name', '');
  next_title text := coalesce(metadata ->> 'title', '');
  next_profile public.profiles;
begin
  if current_user_id is null then
    return null;
  end if;

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
    current_user_id,
    next_role,
    next_email,
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
    title = excluded.title
  returning * into next_profile;

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
      'clinician-' || replace(current_user_id::text, '-', ''),
      current_user_id,
      case when next_full_name = '' then 'New clinician' else next_full_name end,
      case when next_title = '' then 'Clinical Research Coordinator' else next_title end,
      case when next_site_name = '' then 'StudyPulse Research Network' else next_site_name end,
      next_email
    )
    on conflict (email) do update
    set
      auth_user_id = excluded.auth_user_id,
      full_name = excluded.full_name,
      title = excluded.title,
      site_name = excluded.site_name;
  end if;

  return next_profile;
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

create policy "profiles insert own"
  on public.profiles
  for insert
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
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'role', 'patient'),
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  coalesce(users.raw_user_meta_data ->> 'phone', ''),
  coalesce(users.raw_user_meta_data ->> 'city', ''),
  coalesce(users.raw_user_meta_data ->> 'state', ''),
  coalesce(users.raw_user_meta_data ->> 'site_name', ''),
  coalesce(users.raw_user_meta_data ->> 'title', '')
from auth.users as users
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

insert into public.clinicians (
  id,
  auth_user_id,
  full_name,
  title,
  site_name,
  email
)
select
  'clinician-' || replace(users.id::text, '-', ''),
  users.id,
  case
    when coalesce(users.raw_user_meta_data ->> 'full_name', '') = ''
      then 'New clinician'
    else coalesce(users.raw_user_meta_data ->> 'full_name', '')
  end,
  case
    when coalesce(users.raw_user_meta_data ->> 'title', '') = ''
      then 'Clinical Research Coordinator'
    else coalesce(users.raw_user_meta_data ->> 'title', '')
  end,
  case
    when coalesce(users.raw_user_meta_data ->> 'site_name', '') = ''
      then 'StudyPulse Research Network'
    else coalesce(users.raw_user_meta_data ->> 'site_name', '')
  end,
  coalesce(users.email, '')
from auth.users as users
where coalesce(users.raw_user_meta_data ->> 'role', 'patient') = 'clinician'
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  full_name = excluded.full_name,
  title = excluded.title,
  site_name = excluded.site_name;

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
  ),
  (
    'study-diabetes',
    'glucoguide-type-2-diabetes-study',
    'GlucoGuide Type 2 Diabetes Study',
    'Type 2 diabetes and glucose tracking',
    'Remote-first study for adults with type 2 diabetes who want structured glucose check-ins and coaching.',
    'This study evaluates digital screening and follow-up for adults managing type 2 diabetes. Participants complete intake, share current medication information, and join remote follow-ups focused on glucose trends and routine adherence.',
    'Adults 30-70 with type 2 diabetes in Ohio, Kentucky, or Indiana who can complete remote check-ins.',
    'Participants should have a recent diabetes diagnosis or ongoing management plan, smartphone access, and willingness to share medication and glucose history.',
    30,
    70,
    'Remote participation with optional Cincinnati lab visit',
    'remote',
    'Recent insulin regimen changes may require coordinator review.',
    'One telehealth screening call and biweekly app check-ins.',
    '1 telehealth screening call, 6 biweekly follow-ups',
    'Endocrinology screening',
    'open',
    '2026-03-25T10:00:00.000Z'
  ),
  (
    'study-asthma',
    'airsense-asthma-control-study',
    'AirSense Asthma Control Study',
    'Asthma control and inhaler adherence',
    'Remote study for adults with recurring asthma symptoms who want digital support between appointments.',
    'This study screens adults with persistent asthma symptoms and evaluates whether structured digital follow-up can improve inhaler routines and symptom reporting.',
    'Adults 18-60 with diagnosed asthma and recent symptom flare-ups.',
    'Participants should use a rescue or maintenance inhaler and be able to complete weekly symptom questionnaires.',
    18,
    60,
    'Remote participation',
    'remote',
    'Recent oral steroid use may require manual review.',
    'One remote screening visit and weekly symptom logs.',
    '1 telehealth screening call, 8 weekly check-ins',
    'Pulmonology screening',
    'open',
    '2026-03-25T12:00:00.000Z'
  ),
  (
    'study-arthritis',
    'jointmotion-arthritis-function-study',
    'JointMotion Arthritis Function Study',
    'Osteoarthritis and daily mobility',
    'Hybrid study for adults managing knee or hip osteoarthritis and looking for structured symptom tracking.',
    'This hybrid study reviews mobility limitations, pain patterns, and treatment history for adults with osteoarthritis. Participants complete a screening intake and one in-person assessment followed by remote check-ins.',
    'Adults 40-75 with osteoarthritis symptoms affecting walking or daily movement.',
    'Participants should be comfortable with one clinic assessment and remote follow-up surveys.',
    40,
    75,
    'Cincinnati clinic + remote follow-ups',
    'hybrid',
    'Recent steroid injections may require extra review.',
    'One clinic visit and three remote mobility surveys.',
    '1 clinic visit, 3 remote follow-ups',
    'Orthopedic screening',
    'open',
    '2026-03-25T14:00:00.000Z'
  ),
  (
    'study-sleep',
    'restwell-sleep-apnea-screening-study',
    'RestWell Sleep Apnea Screening Study',
    'Sleep apnea risk and overnight symptoms',
    'Hybrid study for adults with suspected sleep apnea who need a faster screening path.',
    'This study evaluates adults with snoring, overnight waking, or daytime fatigue who may be at risk for sleep apnea. Participants complete screening, one device pickup, and remote follow-up.',
    'Adults 25-65 with suspected sleep apnea or recent referral for overnight screening.',
    'Participants should be willing to complete one clinic pickup and a home sleep assessment.',
    25,
    65,
    'Northern Kentucky clinic + home sleep kit',
    'hybrid',
    'Sedative medication changes may require coordinator review.',
    'One clinic pickup and one overnight home test window.',
    '1 device pickup, 1 home test, 1 results call',
    'Sleep medicine screening',
    'open',
    '2026-03-25T16:00:00.000Z'
  ),
  (
    'study-pressure',
    'pressurepoint-blood-pressure-study',
    'PressurePoint Blood Pressure Study',
    'High blood pressure and home monitoring',
    'Remote-first study for adults with hypertension who already track blood pressure at home.',
    'This remote-first study reviews home blood pressure readings, medication adherence, and lifestyle patterns for adults with hypertension.',
    'Adults 30-75 with hypertension and access to a home blood pressure cuff.',
    'Participants should be able to submit weekly readings and join one telehealth review call.',
    30,
    75,
    'Remote participation',
    'remote',
    'Major medication changes within the last 2 weeks may require review.',
    'One telehealth screening call and weekly reading uploads.',
    '1 telehealth screening call, 6 weekly uploads',
    'Cardiology screening',
    'open',
    '2026-03-25T18:00:00.000Z'
  ),
  (
    'study-adhd',
    'focuspath-adult-adhd-study',
    'FocusPath Adult ADHD Study',
    'Adult ADHD and focus routines',
    'Remote study for adults with ADHD who want to test structured check-ins and symptom tracking.',
    'This study screens adults with ADHD symptoms for a remote follow-up program focused on routine adherence, attention patterns, and digital support tools.',
    'Adults 18-45 with diagnosed ADHD or active evaluation in progress.',
    'Participants should be comfortable with app-based questionnaires and short telehealth calls.',
    18,
    45,
    'Remote participation',
    'remote',
    'Recent stimulant medication changes may require review.',
    'One screening call and short twice-weekly digital check-ins.',
    '1 screening call, 8 short digital check-ins',
    'Behavioral health screening',
    'open',
    '2026-03-24T10:30:00.000Z'
  ),
  (
    'study-endo',
    'lunaendo-endometriosis-study',
    'LunaEndo Endometriosis Study',
    'Endometriosis and pelvic pain tracking',
    'Remote-first study for adults with endometriosis symptoms who need better symptom documentation.',
    'This study evaluates digital symptom reporting and screening workflows for adults living with endometriosis or chronic pelvic pain.',
    'Adults 18-45 with diagnosed or suspected endometriosis and recurring pelvic pain.',
    'Participants should be able to track symptoms weekly and discuss medication history in a telehealth screening call.',
    18,
    45,
    'Remote participation with optional Cincinnati consult',
    'remote',
    'New hormonal therapy may require coordinator review.',
    'One telehealth screening call and weekly symptom journals.',
    '1 telehealth screening call, 6 weekly journals',
    'Women''s health screening',
    'open',
    '2026-03-24T12:00:00.000Z'
  ),
  (
    'study-copd',
    'breatheeasy-copd-screening-study',
    'BreatheEasy COPD Screening Study',
    'COPD and breathing symptom monitoring',
    'Hybrid study for adults with COPD or chronic breathing symptoms who want more structured screening.',
    'This study screens adults with COPD or chronic breathing symptoms for a mixed in-person and remote monitoring program.',
    'Adults 40-80 with COPD, chronic bronchitis, or unexplained shortness of breath.',
    'Participants should be willing to attend one clinic visit and complete remote symptom tracking.',
    40,
    80,
    'Cincinnati clinic + remote symptom tracking',
    'hybrid',
    'Recent hospitalization for respiratory flare-up may require manual review.',
    'One clinic visit and weekly symptom logs.',
    '1 clinic visit, 5 weekly logs',
    'Pulmonology screening',
    'open',
    '2026-03-24T14:00:00.000Z'
  ),
  (
    'study-ibs',
    'ibs-balance-digestive-study',
    'IBS Balance Digestive Study',
    'IBS and digestive symptom patterns',
    'Remote study for adults tracking IBS symptoms, triggers, and treatment routines.',
    'This remote study reviews digestive symptoms, diet triggers, and treatment history for adults with IBS.',
    'Adults 18-65 with IBS symptoms occurring at least twice per month.',
    'Participants should be comfortable logging diet triggers and attending one screening call.',
    18,
    65,
    'Remote participation',
    'remote',
    'Recent GI procedures may require review.',
    'One screening call and weekly diet or symptom check-ins.',
    '1 screening call, 6 weekly logs',
    'Gastroenterology screening',
    'open',
    '2026-03-24T16:00:00.000Z'
  ),
  (
    'study-prediabetes',
    'thrivemetabolic-prediabetes-study',
    'ThriveMetabolic Prediabetes Study',
    'Prediabetes and metabolic health',
    'Remote-first study for adults at risk for diabetes who want structured lifestyle follow-up.',
    'This study screens adults with prediabetes or recent high A1C readings for a remote behavior and follow-up program.',
    'Adults 25-65 with prediabetes or elevated blood sugar risk factors.',
    'Participants should be able to complete digital questionnaires and share recent lab history if available.',
    25,
    65,
    'Remote participation',
    'remote',
    'Current insulin therapy is outside scope for this study.',
    'One telehealth screening call and weekly habit check-ins.',
    '1 telehealth screening call, 8 weekly check-ins',
    'Metabolic screening',
    'open',
    '2026-03-24T18:00:00.000Z'
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
  ),
  (
    'app-avery',
    'study-heart',
    null,
    'Avery Thompson',
    37,
    'Dayton',
    'OH',
    '(937) 555-0131',
    'avery@demo.com',
    'Irregular heart flutter after long runs',
    'Albuterol inhaler as needed',
    'Weekdays after 6 PM',
    'I want to understand whether my symptoms are serious before they affect my training.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T08:15:00.000Z',
    '2026-03-29T08:15:00.000Z',
    '2026-03-29T08:15:00.000Z'
  ),
  (
    'app-casey',
    'study-migraine',
    null,
    'Casey Nguyen',
    26,
    'Cleveland',
    'OH',
    '(216) 555-0108',
    'casey@demo.com',
    'Four to five migraine days each month with nausea',
    'Sumatriptan as needed',
    'Remote check-ins on lunch breaks',
    'I want better prevention options and a clear symptom tracking routine.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T07:55:00.000Z',
    '2026-03-29T07:55:00.000Z',
    '2026-03-29T07:55:00.000Z'
  ),
  (
    'app-devon',
    'study-heart',
    null,
    'Devon Brooks',
    44,
    'Louisville',
    'KY',
    '(502) 555-0182',
    'devon@demo.com',
    'Nighttime palpitations with occasional dizziness',
    'Lisinopril',
    'Tuesday and Thursday afternoons',
    'I want a clinician-guided screening path instead of waiting until symptoms get worse.',
    'under_review',
    'Good age and geography. Review dizziness history before deciding.',
    null,
    '',
    '2026-03-29T09:05:00.000Z',
    '2026-03-28T18:25:00.000Z',
    '2026-03-29T09:05:00.000Z'
  ),
  (
    'app-elena',
    'study-migraine',
    null,
    'Elena Ramirez',
    34,
    'Cincinnati',
    'OH',
    '(513) 555-0166',
    'elena@demo.com',
    'Weekly migraines triggered by bright light and stress',
    'Topiramate started this month',
    'Remote visits after 4 PM',
    'I want to join a study that helps me understand trigger patterns and prevention.',
    'info_requested',
    'Recent medication change needs clarification before review can continue.',
    null,
    '',
    '2026-03-29T08:42:00.000Z',
    '2026-03-28T13:10:00.000Z',
    '2026-03-29T08:42:00.000Z'
  ),
  (
    'app-parker',
    'study-heart',
    null,
    'Parker Singh',
    52,
    'Cincinnati',
    'OH',
    '(513) 555-0193',
    'parker@demo.com',
    'Episodes of racing heartbeat during morning walks',
    'Metformin and atorvastatin',
    'Weekday mornings',
    'I can travel for one clinic visit and I want a faster screening process.',
    'scheduled_call',
    'Solid fit. Call scheduled to review wearable history.',
    '2026-03-31 09:30 AM EDT',
    'Initial screening call to confirm symptom timing and device data access.',
    '2026-03-29T09:20:00.000Z',
    '2026-03-27T15:50:00.000Z',
    '2026-03-29T09:20:00.000Z'
  ),
  (
    'app-naomi',
    'study-migraine',
    null,
    'Naomi Foster',
    41,
    'Toledo',
    'OH',
    '(419) 555-0144',
    'naomi@demo.com',
    'Chronic migraines with visual aura',
    'Propranolol preventive therapy',
    'Remote appointments any weekday after 5 PM',
    'I want a more disciplined prevention plan and I am comfortable with digital follow-up.',
    'eligible',
    'Strong remote fit and history is well documented.',
    null,
    '',
    '2026-03-29T07:40:00.000Z',
    '2026-03-27T11:05:00.000Z',
    '2026-03-29T07:40:00.000Z'
  ),
  (
    'app-malik',
    'study-heart',
    null,
    'Malik Johnson',
    67,
    'Covington',
    'KY',
    '(859) 555-0124',
    'malik@demo.com',
    'Skipped beats and fatigue after stair climbing',
    'Amiodarone',
    'Open weekdays',
    'I live close enough to participate if I qualify.',
    'not_eligible',
    'Outside target age range and medication profile needs a different pathway.',
    null,
    '',
    '2026-03-28T16:15:00.000Z',
    '2026-03-27T10:25:00.000Z',
    '2026-03-28T16:15:00.000Z'
  ),
  (
    'app-sophia',
    'study-migraine',
    null,
    'Sophia Turner',
    22,
    'Athens',
    'OH',
    '(740) 555-0188',
    'sophia@demo.com',
    'Migraine attacks around exam weeks and sleep disruption',
    'None',
    'Remote evenings except Fridays',
    'I want a remote study that fits around school and helps me identify patterns.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T06:50:00.000Z',
    '2026-03-29T06:50:00.000Z',
    '2026-03-29T06:50:00.000Z'
  ),
  (
    'app-ethan',
    'study-heart',
    null,
    'Ethan Rivera',
    33,
    'Mason',
    'OH',
    '(513) 555-0170',
    'ethan@demo.com',
    'Heart pounding after caffeine and short sprints',
    'None',
    'Flexible midday schedule',
    'I already use a smartwatch and can share data if it helps the screening.',
    'under_review',
    'Good wearable usage. Need to verify symptom duration history.',
    null,
    '',
    '2026-03-29T08:18:00.000Z',
    '2026-03-28T12:00:00.000Z',
    '2026-03-29T08:18:00.000Z'
  ),
  (
    'app-chloe',
    'study-migraine',
    null,
    'Chloe Bennett',
    39,
    'Akron',
    'OH',
    '(330) 555-0120',
    'chloe@demo.com',
    'Migraines with neck pain and sensitivity to sound',
    'Recently switched preventive medication',
    'Remote calls on Mondays and Wednesdays',
    'I want a structured follow-up plan after a recent medication change.',
    'info_requested',
    'Medication timeline needs clarification.',
    null,
    '',
    '2026-03-29T07:25:00.000Z',
    '2026-03-27T17:35:00.000Z',
    '2026-03-29T07:25:00.000Z'
  ),
  (
    'app-lucas',
    'study-heart',
    null,
    'Lucas Hall',
    58,
    'Frankfort',
    'KY',
    '(502) 555-0191',
    'lucas@demo.com',
    'Irregular heartbeat episodes flagged by Apple Watch',
    'Aspirin only',
    'Weekday mornings and telehealth follow-ups',
    'I want a fast answer on whether my wearable alerts are clinically meaningful.',
    'eligible',
    'Strong fit and clean medication profile.',
    null,
    '',
    '2026-03-29T06:55:00.000Z',
    '2026-03-26T14:45:00.000Z',
    '2026-03-29T06:55:00.000Z'
  ),
  (
    'app-maya',
    'study-migraine',
    null,
    'Maya Collins',
    28,
    'Cincinnati',
    'OH',
    '(513) 555-0155',
    'maya@demo.com',
    'Hormonal migraines with severe light sensitivity',
    'Rizatriptan and magnesium',
    'Remote evenings',
    'I want to participate in a study that is easy to complete around work.',
    'scheduled_call',
    'Ready for telehealth screening call.',
    '2026-03-31 01:00 PM EDT',
    'Telehealth call to confirm preventive medication history.',
    '2026-03-29T09:12:00.000Z',
    '2026-03-27T13:20:00.000Z',
    '2026-03-29T09:12:00.000Z'
  ),
  (
    'app-owen',
    'study-heart',
    null,
    'Owen Price',
    46,
    'Hamilton',
    'OH',
    '(513) 555-0185',
    'owen@demo.com',
    'Short bursts of tachycardia after yard work',
    'Hydrochlorothiazide',
    'Fridays and Saturday mornings',
    'I am looking for a screening option that combines one visit with remote follow-up.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T08:45:00.000Z',
    '2026-03-29T08:45:00.000Z',
    '2026-03-29T08:45:00.000Z'
  ),
  (
    'app-zoe',
    'study-migraine',
    null,
    'Zoe Murphy',
    57,
    'Dayton',
    'OH',
    '(937) 555-0127',
    'zoe@demo.com',
    'Long history of migraines with blurred vision',
    'Nortriptyline',
    'Remote weekdays',
    'I was hoping for a remote migraine study that might fit my schedule.',
    'not_eligible',
    'Outside target age range for this study.',
    null,
    '',
    '2026-03-28T17:40:00.000Z',
    '2026-03-26T18:25:00.000Z',
    '2026-03-28T17:40:00.000Z'
  ),
  (
    'app-caleb',
    'study-heart',
    null,
    'Caleb Ward',
    35,
    'Florence',
    'KY',
    '(859) 555-0161',
    'caleb@demo.com',
    'Fluttering sensation and chest awareness during stress',
    'None',
    'Weekday lunch hour calls',
    'I want help figuring out whether stress is driving these episodes.',
    'info_requested',
    'Need baseline symptom frequency before review can proceed.',
    null,
    '',
    '2026-03-29T08:55:00.000Z',
    '2026-03-28T10:45:00.000Z',
    '2026-03-29T08:55:00.000Z'
  ),
  (
    'app-harper',
    'study-migraine',
    null,
    'Harper Cox',
    30,
    'Louisville',
    'KY',
    '(502) 555-0137',
    'harper@demo.com',
    'Frequent headaches with nausea and sensitivity to smell',
    'Ondansetron as needed',
    'Remote after 3 PM',
    'I can reliably complete digital follow-ups and want better prevention options.',
    'under_review',
    'Need to confirm Kentucky remote participation documentation.',
    null,
    '',
    '2026-03-29T07:58:00.000Z',
    '2026-03-28T08:35:00.000Z',
    '2026-03-29T07:58:00.000Z'
  ),
  (
    'app-isaac',
    'study-heart',
    null,
    'Isaac Reed',
    41,
    'Newport',
    'KY',
    '(859) 555-0152',
    'isaac@demo.com',
    'Occasional racing heartbeat after climbing stairs',
    'Losartan',
    'Weekday mornings before 10 AM',
    'I want a clear yes or no on whether these episodes need follow-up.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T07:10:00.000Z',
    '2026-03-29T07:10:00.000Z',
    '2026-03-29T07:10:00.000Z'
  ),
  (
    'app-nora',
    'study-migraine',
    null,
    'Nora Diaz',
    45,
    'Columbus',
    'OH',
    '(614) 555-0169',
    'nora@demo.com',
    'Recurring migraines with visual aura and fatigue',
    'CGRP preventive injection',
    'Remote weekdays after noon',
    'I am comfortable with digital tools and want a study with organized follow-up.',
    'eligible',
    'Excellent remote fit and complete history.',
    null,
    '',
    '2026-03-29T06:35:00.000Z',
    '2026-03-27T09:55:00.000Z',
    '2026-03-29T06:35:00.000Z'
  ),
  (
    'app-mason',
    'study-heart',
    null,
    'Mason Scott',
    55,
    'Cincinnati',
    'OH',
    '(513) 555-0116',
    'mason@demo.com',
    'PVC-like skipped beats after late-night shifts',
    'None',
    'Weekdays before 2 PM',
    'I want screening that does not require repeated in-person visits.',
    'under_review',
    'Reasonable fit. Need work schedule details before call.',
    null,
    '',
    '2026-03-29T08:00:00.000Z',
    '2026-03-28T16:30:00.000Z',
    '2026-03-29T08:00:00.000Z'
  ),
  (
    'app-layla',
    'study-migraine',
    null,
    'Layla Peterson',
    24,
    'Bowling Green',
    'KY',
    '(270) 555-0134',
    'layla@demo.com',
    'Migraines with severe light sensitivity after long screen time',
    'Ibuprofen as needed',
    'Remote evenings and weekends',
    'I want a fully digital program that fits around graduate school.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T09:05:00.000Z',
    '2026-03-29T09:05:00.000Z',
    '2026-03-29T09:05:00.000Z'
  ),
  (
    'app-aiden',
    'study-heart',
    null,
    'Aiden Ross',
    19,
    'Springboro',
    'OH',
    '(937) 555-0174',
    'aiden@demo.com',
    'Rapid heartbeats during basketball drills',
    'None',
    'After school and weekends',
    'I want to know if I should stop training while I wait for appointments.',
    'not_eligible',
    'Symptoms may fit, but age and sports medicine history require a different pathway.',
    null,
    '',
    '2026-03-28T18:05:00.000Z',
    '2026-03-27T19:40:00.000Z',
    '2026-03-28T18:05:00.000Z'
  ),
  (
    'app-stella',
    'study-migraine',
    null,
    'Stella Hughes',
    36,
    'Cincinnati',
    'OH',
    '(513) 555-0149',
    'stella@demo.com',
    'Three migraine episodes a month with dizziness',
    'Recently stopped topiramate',
    'Remote after 6 PM',
    'I want to participate because the remote design fits my childcare schedule.',
    'info_requested',
    'Need details on medication stop date.',
    null,
    '',
    '2026-03-29T08:28:00.000Z',
    '2026-03-28T11:25:00.000Z',
    '2026-03-29T08:28:00.000Z'
  ),
  (
    'app-adrian',
    'study-heart',
    null,
    'Adrian Kelly',
    61,
    'Georgetown',
    'KY',
    '(502) 555-0147',
    'adrian@demo.com',
    'Heart rhythm spikes captured on Fitbit overnight',
    'Statin only',
    'Weekday mornings and telehealth afternoons',
    'I already have device data and want a screening path that moves quickly.',
    'scheduled_call',
    'Call scheduled to confirm device access and symptom timeline.',
    '2026-03-31 11:15 AM EDT',
    'Coordinator call to review rhythm spike summaries and clinic visit timing.',
    '2026-03-29T08:50:00.000Z',
    '2026-03-27T08:40:00.000Z',
    '2026-03-29T08:50:00.000Z'
  ),
  (
    'app-brielle',
    'study-migraine',
    null,
    'Brielle Watson',
    33,
    'Lexington',
    'KY',
    '(859) 555-0181',
    'brielle@demo.com',
    'Migraines tied to missed sleep and frequent travel',
    'Vitamin B2 supplement',
    'Remote only after 5 PM',
    'I need a study that works while I travel for work and can complete telehealth visits.',
    'under_review',
    'Travel schedule may still fit remote-first design. Review consistency for follow-ups.',
    null,
    '',
    '2026-03-29T07:48:00.000Z',
    '2026-03-28T14:20:00.000Z',
    '2026-03-29T07:48:00.000Z'
  ),
  (
    'app-julian',
    'study-heart',
    null,
    'Julian Flores',
    48,
    'Middletown',
    'OH',
    '(513) 555-0112',
    'julian@demo.com',
    'Recurring palpitations during commute stress',
    'None',
    'Telehealth at lunch, clinic visit on Fridays',
    'I want a clear screening plan before symptoms disrupt work further.',
    'eligible',
    'High fit and responsive communication.',
    null,
    '',
    '2026-03-29T06:48:00.000Z',
    '2026-03-27T12:40:00.000Z',
    '2026-03-29T06:48:00.000Z'
  ),
  (
    'app-kendra',
    'study-migraine',
    null,
    'Kendra Powell',
    27,
    'Oxford',
    'OH',
    '(513) 555-0105',
    'kendra@demo.com',
    'Migraine headaches with sensitivity to noise and light',
    'None',
    'Remote mornings before work',
    'I want to see whether a structured study can help me catch triggers earlier.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T08:05:00.000Z',
    '2026-03-29T08:05:00.000Z',
    '2026-03-29T08:05:00.000Z'
  ),
  (
    'app-trevor',
    'study-heart',
    null,
    'Trevor Myers',
    39,
    'Cleveland',
    'OH',
    '(216) 555-0148',
    'trevor@demo.com',
    'Occasional heart pounding with shortness of breath on stairs',
    'None',
    'Flexible remote check-ins and one clinic visit',
    'I want a screening option that is faster than waiting for a separate referral.',
    'submitted',
    '',
    null,
    '',
    '2026-03-29T09:18:00.000Z',
    '2026-03-29T09:18:00.000Z',
    '2026-03-29T09:18:00.000Z'
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
  ),
  (
    'req-elena-1',
    'app-elena',
    'Clarify medication start date',
    'Please tell us when you started topiramate and whether your migraine frequency changed afterward.',
    'Due in 24 hours',
    'open',
    '',
    null,
    '2026-03-29T08:10:00.000Z'
  ),
  (
    'req-chloe-1',
    'app-chloe',
    'Share preventive medication timeline',
    'Please list the date of your recent medication switch and any side effects you noticed.',
    'Due tomorrow',
    'open',
    '',
    null,
    '2026-03-29T07:05:00.000Z'
  ),
  (
    'req-chloe-2',
    'app-chloe',
    'Upload headache log',
    'Send a short summary of your headache frequency from the last four weeks.',
    'Completed',
    'responded',
    'Uploaded a spreadsheet with six migraine days in the past month.',
    '2026-03-28T19:30:00.000Z',
    '2026-03-28T12:20:00.000Z'
  ),
  (
    'req-caleb-1',
    'app-caleb',
    'Confirm weekly symptom count',
    'How many times per week do you notice fluttering or chest awareness, and how long do those episodes last?',
    'Due today',
    'open',
    '',
    null,
    '2026-03-29T08:40:00.000Z'
  ),
  (
    'req-stella-1',
    'app-stella',
    'Confirm medication stop date',
    'Please tell us exactly when you stopped topiramate and whether your symptoms changed after stopping it.',
    'Due in 48 hours',
    'open',
    '',
    null,
    '2026-03-29T08:18:00.000Z'
  ),
  (
    'req-morgan-1',
    'app-morgan',
    'Add migraine frequency summary',
    'Please summarize how many migraine days you had in the last 30 days and any major triggers you noticed.',
    'Completed',
    'responded',
    'I had nine migraine days in the last month, mostly triggered by stress and missed meals.',
    '2026-03-28T18:22:00.000Z',
    '2026-03-28T10:40:00.000Z'
  );
