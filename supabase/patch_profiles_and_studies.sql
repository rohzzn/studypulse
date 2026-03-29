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

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

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
  )
on conflict (id) do update
set
  slug = excluded.slug,
  title = excluded.title,
  condition = excluded.condition,
  short_description = excluded.short_description,
  description = excluded.description,
  eligibility_summary = excluded.eligibility_summary,
  requirements = excluded.requirements,
  age_min = excluded.age_min,
  age_max = excluded.age_max,
  location_label = excluded.location_label,
  location_type = excluded.location_type,
  medications_exclusions = excluded.medications_exclusions,
  availability_requirements = excluded.availability_requirements,
  time_commitment = excluded.time_commitment,
  study_type = excluded.study_type,
  recruit_status = excluded.recruit_status,
  created_at = excluded.created_at;
