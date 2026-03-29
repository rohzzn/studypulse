create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  study_name text not null,
  cohort text,
  coordinator_name text,
  coordinator_note text,
  next_dose_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_visits (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  title text not null,
  scheduled_for timestamptz not null,
  location text not null,
  status text not null check (status in ('scheduled', 'confirmed', 'completed')),
  prep_summary text,
  checklist text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  title text not null,
  detail text not null,
  status text not null check (status in ('done', 'upcoming', 'attention')),
  due_label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  title text not null,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  window_label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  medication_taken boolean not null,
  energy_level text not null check (energy_level in ('Low', 'Steady', 'High')),
  stress_level integer not null check (stress_level between 1 and 5),
  symptoms text[] not null default '{}',
  notes text,
  support_requested boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;
alter table public.study_visits enable row level security;
alter table public.care_tasks enable row level security;
alter table public.alerts enable row level security;
alter table public.daily_check_ins enable row level security;

drop policy if exists "participants read for demo" on public.participants;
create policy "participants read for demo"
  on public.participants
  for select
  using (true);

drop policy if exists "study visits read for demo" on public.study_visits;
create policy "study visits read for demo"
  on public.study_visits
  for select
  using (true);

drop policy if exists "care tasks read for demo" on public.care_tasks;
create policy "care tasks read for demo"
  on public.care_tasks
  for select
  using (true);

drop policy if exists "alerts read for demo" on public.alerts;
create policy "alerts read for demo"
  on public.alerts
  for select
  using (true);

drop policy if exists "daily check-ins read for demo" on public.daily_check_ins;
create policy "daily check-ins read for demo"
  on public.daily_check_ins
  for select
  using (true);

drop policy if exists "daily check-ins insert for demo" on public.daily_check_ins;
create policy "daily check-ins insert for demo"
  on public.daily_check_ins
  for insert
  with check (true);

insert into public.participants (
  id,
  first_name,
  study_name,
  cohort,
  coordinator_name,
  coordinator_note,
  next_dose_label
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Maya',
  'CardioTrack Phase II',
  'Remote monitoring cohort',
  'Avery Chen',
  'Your wearable feed looks steady. If dizziness returns, request support in the app so the site can follow up quickly.',
  'Tonight at 8:00 PM'
)
on conflict (id) do update
set
  first_name = excluded.first_name,
  study_name = excluded.study_name,
  cohort = excluded.cohort,
  coordinator_name = excluded.coordinator_name,
  coordinator_note = excluded.coordinator_note,
  next_dose_label = excluded.next_dose_label;

delete from public.study_visits
where participant_id = '11111111-1111-1111-1111-111111111111';

delete from public.care_tasks
where participant_id = '11111111-1111-1111-1111-111111111111';

delete from public.alerts
where participant_id = '11111111-1111-1111-1111-111111111111';

delete from public.daily_check_ins
where participant_id = '11111111-1111-1111-1111-111111111111';

insert into public.study_visits (
  participant_id,
  title,
  scheduled_for,
  location,
  status,
  prep_summary,
  checklist
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Week 02 site visit',
    '2026-03-29T10:30:00-04:00',
    '1819 Innovation Hub, Room 320',
    'confirmed',
    'Bring your study wristband, a photo ID, and note any symptoms that changed overnight.',
    array['Bring smartwatch and charger', 'Bring student ID and trial card', 'Avoid caffeine two hours before vitals']
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Remote telehealth follow-up',
    '2026-04-01T16:00:00-04:00',
    'Secure study video room',
    'scheduled',
    'Open the in-app telehealth link five minutes early and make sure notifications are enabled.',
    array['Quiet room', 'Camera permissions enabled', 'Recent symptom notes ready']
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Lab review and drug accountability',
    '2026-04-07T09:15:00-04:00',
    'UC Clinical Research Center',
    'scheduled',
    'Coordinator will reconcile doses, side effects, and wearable data for the previous week.',
    array['Bring medication bottle', 'Confirm travel route', 'Upload adverse-event notes']
  );

insert into public.care_tasks (
  participant_id,
  title,
  detail,
  status,
  due_label,
  sort_order
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Complete today''s symptom check-in',
    'Needed before sponsor review at noon.',
    'attention',
    'Due by 11:00 AM',
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Evening medication dose',
    'Take with food and confirm in the app.',
    'upcoming',
    '8:00 PM',
    2
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Charge smartwatch and pack study ID',
    'Helps the site team capture uninterrupted vitals.',
    'upcoming',
    'Tonight',
    3
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Baseline lab upload confirmed',
    'File already synced for tomorrow''s visit.',
    'done',
    'Completed',
    4
  );

insert into public.alerts (
  participant_id,
  title,
  description,
  severity,
  window_label
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Missed check-in risk',
    'Participant has not submitted this morning''s symptom report. Auto-reminder sent and coordinator ping ready if no response by 10:30 AM.',
    'medium',
    'Action window: 40m'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Dizziness trend cooling down',
    'Reported dizziness dropped from 3 episodes to 1 episode after dose timing adjustment.',
    'low',
    'Updated this morning'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Visit prep nearly complete',
    'Three of four visit requirements are already cleared. Only the daily check-in remains open.',
    'low',
    'Before tomorrow 10:30 AM'
  );

insert into public.daily_check_ins (
  participant_id,
  medication_taken,
  energy_level,
  stress_level,
  symptoms,
  notes,
  support_requested,
  created_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  true,
  'Steady',
  2,
  array['fatigue'],
  'Felt a little tired after class but symptoms were manageable.',
  false,
  '2026-03-27T20:14:00-04:00'
);
