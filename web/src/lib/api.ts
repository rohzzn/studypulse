import { type Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabase';
import type {
  ActionResult,
  ApplicationDraft,
  ApplicationStatus,
  AuthSignInInput,
  AuthSignUpInput,
  ClinicianRequestDraft,
  PatientApplication,
  Profile,
  ScheduleCallDraft,
  ScreeningRequest,
  StudyDraft,
  StudyProgram,
} from './types';

type StudyRow = {
  age_max: number;
  age_min: number;
  availability_requirements: string;
  condition: string;
  created_at: string;
  description: string;
  eligibility_summary: string;
  id: string;
  location_label: string;
  location_type: StudyProgram['locationType'];
  medications_exclusions: string;
  recruit_status: StudyProgram['recruitStatus'];
  requirements: string;
  short_description: string;
  slug: string;
  study_type: string;
  time_commitment: string;
  title: string;
};

type ProfileRow = {
  city: string;
  email: string;
  full_name: string;
  id: string;
  phone: string;
  role: Profile['role'];
  site_name: string;
  state: string;
  title: string;
};

type ApplicationRow = {
  age: number;
  auth_user_id: string | null;
  availability: string;
  city: string;
  clinician_notes: string;
  condition: string;
  created_at: string;
  current_medications: string;
  email: string;
  full_name: string;
  id: string;
  last_status_at: string;
  motivation: string;
  phone: string;
  scheduled_call_at: string | null;
  scheduled_call_reason: string;
  state: string;
  status: ApplicationStatus;
  study_id: string;
  updated_at: string;
};

type RequestRow = {
  application_id: string;
  body: string;
  created_at: string;
  due_label: string;
  id: string;
  patient_response: string;
  responded_at: string | null;
  status: ScreeningRequest['status'];
  title: string;
};

const defaultAuthRedirectUrl = 'https://studypulse.tech';
const authRedirectUrl =
  (import.meta.env.VITE_AUTH_REDIRECT_URL as
    | string
    | undefined)?.trim() || defaultAuthRedirectUrl;

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured for the web app.'
    );
  }

  return supabase;
}

function formatSignUpErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('rate limit') ||
    normalized.includes('email rate')
  ) {
    return 'Supabase email sending is rate limited right now. For the hackathon, disable Confirm email or configure custom SMTP in Supabase Auth, then try again.';
  }

  return message;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    state: row.state,
    siteName: row.site_name,
    title: row.title,
  };
}

function mapStudy(row: StudyRow): StudyProgram {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    shortDescription: row.short_description,
    description: row.description,
    eligibilitySummary: row.eligibility_summary,
    requirements: row.requirements,
    ageMin: row.age_min,
    ageMax: row.age_max,
    locationLabel: row.location_label,
    locationType: row.location_type,
    medicationsExclusions: row.medications_exclusions,
    availabilityRequirements:
      row.availability_requirements,
    timeCommitment: row.time_commitment,
    studyType: row.study_type,
    recruitStatus: row.recruit_status,
    createdAt: row.created_at,
  };
}

function mapApplication(row: ApplicationRow): PatientApplication {
  return {
    id: row.id,
    studyId: row.study_id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    age: row.age,
    city: row.city,
    state: row.state,
    phone: row.phone,
    email: row.email,
    condition: row.condition,
    currentMedications: row.current_medications,
    availability: row.availability,
    motivation: row.motivation,
    status: row.status,
    clinicianNotes: row.clinician_notes,
    scheduledCallAt: row.scheduled_call_at,
    scheduledCallReason: row.scheduled_call_reason,
    lastStatusAt: row.last_status_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row: RequestRow): ScreeningRequest {
  return {
    id: row.id,
    applicationId: row.application_id,
    title: row.title,
    body: row.body,
    dueLabel: row.due_label,
    status: row.status,
    patientResponse: row.patient_response,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, role, email, full_name, phone, city, state, site_name, title'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data as ProfileRow) : null;
}

export async function bootstrapProfile(): Promise<Profile | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc(
    'bootstrap_profile'
  );

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapProfile(row as ProfileRow) : null;
}

export async function signUp(
  input: AuthSignUpInput
): Promise<ActionResult> {
  const client = requireSupabase();
  const { error, data } = await client.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: authRedirectUrl,
      data: {
        role: input.role,
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        site_name: input.siteName.trim(),
        title: input.title.trim(),
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: formatSignUpErrorMessage(error.message),
    };
  }

  if (!data.session) {
    return {
      ok: true,
      message:
        'Account created. Check your email to confirm your account, then sign in.',
    };
  }

  return {
    ok: true,
    message: 'Account created and signed in.',
  };
}

export async function signIn(
  input: AuthSignInInput
): Promise<ActionResult> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Signed in.',
  };
}

export async function signOut(): Promise<void> {
  const client = requireSupabase();
  await client.auth.signOut();
}

export async function fetchStudies(): Promise<StudyProgram[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('study_programs')
    .select(
      'id, slug, title, condition, short_description, description, eligibility_summary, requirements, age_min, age_max, location_label, location_type, medications_exclusions, availability_requirements, time_commitment, study_type, recruit_status, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as StudyRow[]).map(mapStudy);
}

export async function fetchPatientApplications(
  session: Session,
  profile: Profile
): Promise<PatientApplication[]> {
  const client = requireSupabase();
  const [authOwnedResult, emailOwnedResult] =
    await Promise.all([
      client
        .from('patient_applications')
        .select(
          'id, study_id, auth_user_id, full_name, age, city, state, phone, email, condition, current_medications, availability, motivation, status, clinician_notes, scheduled_call_at, scheduled_call_reason, last_status_at, created_at, updated_at'
        )
        .eq('auth_user_id', session.user.id)
        .order('updated_at', { ascending: false }),
      client
        .from('patient_applications')
        .select(
          'id, study_id, auth_user_id, full_name, age, city, state, phone, email, condition, current_medications, availability, motivation, status, clinician_notes, scheduled_call_at, scheduled_call_reason, last_status_at, created_at, updated_at'
        )
        .eq('email', profile.email.toLowerCase())
        .order('updated_at', { ascending: false }),
    ]);

  const error =
    authOwnedResult.error ?? emailOwnedResult.error;

  if (error) {
    throw new Error(error.message);
  }

  const merged = new Map<string, PatientApplication>();

  for (const row of [
    ...((authOwnedResult.data ?? []) as ApplicationRow[]),
    ...((emailOwnedResult.data ?? []) as ApplicationRow[]),
  ]) {
    const application = mapApplication(row);
    merged.set(application.id, application);
  }

  return [...merged.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export async function fetchRequestsForApplications(
  applicationIds: string[]
): Promise<ScreeningRequest[]> {
  if (applicationIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('screening_requests')
    .select(
      'id, application_id, title, body, due_label, status, patient_response, responded_at, created_at'
    )
    .in('application_id', applicationIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as RequestRow[]).map(mapRequest);
}

export async function fetchAllApplications(): Promise<
  PatientApplication[]
> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('patient_applications')
    .select(
      'id, study_id, auth_user_id, full_name, age, city, state, phone, email, condition, current_medications, availability, motivation, status, clinician_notes, scheduled_call_at, scheduled_call_reason, last_status_at, created_at, updated_at'
    )
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ApplicationRow[]).map(mapApplication);
}

export async function fetchAllRequests(): Promise<
  ScreeningRequest[]
> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('screening_requests')
    .select(
      'id, application_id, title, body, due_label, status, patient_response, responded_at, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as RequestRow[]).map(mapRequest);
}

export async function createPatientApplication(
  session: Session,
  profile: Profile,
  studyId: string,
  draft: ApplicationDraft
): Promise<ActionResult> {
  const client = requireSupabase();
  const trimmedAge = Number(draft.age);

  if (
    !draft.fullName.trim() ||
    !draft.age.trim() ||
    !draft.city.trim() ||
    !draft.state.trim() ||
    !draft.phone.trim() ||
    !draft.condition.trim() ||
    !draft.availability.trim() ||
    !draft.motivation.trim() ||
    Number.isNaN(trimmedAge)
  ) {
    return {
      ok: false,
      message: 'Complete the application before submitting it.',
    };
  }

  if (trimmedAge < 18 || trimmedAge > 120) {
    return {
      ok: false,
      message: 'Enter a valid age between 18 and 120.',
    };
  }

  const payload = {
    study_id: studyId,
    auth_user_id: session.user.id,
    full_name: draft.fullName.trim(),
    age: trimmedAge,
    city: draft.city.trim(),
    state: draft.state.trim(),
    phone: draft.phone.trim(),
    email: profile.email.toLowerCase(),
    condition: draft.condition.trim(),
    current_medications: draft.currentMedications.trim(),
    availability: draft.availability.trim(),
    motivation: draft.motivation.trim(),
    status: 'submitted' as const,
  };

  const { data, error } = await client
    .from('patient_applications')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Application submitted.',
    applicationId: (data as { id: string }).id,
  };
}

export async function respondToRequest(
  requestId: string,
  response: string
): Promise<ActionResult> {
  const client = requireSupabase();
  const trimmed = response.trim();

  if (!trimmed) {
    return {
      ok: false,
      message: 'Add a response before sending it.',
    };
  }

  const respondedAt = new Date().toISOString();
  const requestResult = await client
    .from('screening_requests')
    .update({
      patient_response: trimmed,
      responded_at: respondedAt,
      status: 'responded',
    })
    .eq('id', requestId)
    .select('application_id')
    .single();

  if (requestResult.error) {
    return {
      ok: false,
      message: requestResult.error.message,
    };
  }

  const applicationId = (
    requestResult.data as { application_id: string }
  ).application_id;

  await client
    .from('patient_applications')
    .update({
      status: 'under_review',
      last_status_at: respondedAt,
    })
    .eq('id', applicationId)
    .eq('status', 'info_requested');

  return {
    ok: true,
    message: 'Response sent.',
  };
}

export async function createStudy(
  draft: StudyDraft
): Promise<ActionResult> {
  const client = requireSupabase();
  const slug = slugify(draft.title);
  const { error } = await client
    .from('study_programs')
    .insert({
      slug,
      title: draft.title.trim(),
      condition: draft.condition.trim(),
      short_description: draft.shortDescription.trim(),
      description: draft.description.trim(),
      eligibility_summary: draft.eligibilitySummary.trim(),
      requirements: draft.requirements.trim(),
      age_min: Number(draft.ageMin),
      age_max: Number(draft.ageMax),
      location_label: draft.locationLabel.trim(),
      location_type: draft.locationType,
      medications_exclusions:
        draft.medicationsExclusions.trim(),
      availability_requirements:
        draft.availabilityRequirements.trim(),
      time_commitment: draft.timeCommitment.trim(),
      study_type: draft.studyType.trim(),
      recruit_status: draft.recruitStatus,
    });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Study published.',
  };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const client = requireSupabase();
  const statusTime = new Date().toISOString();
  const { error } = await client
    .from('patient_applications')
    .update({
      status,
      last_status_at: statusTime,
    })
    .eq('id', applicationId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Application updated.',
  };
}

export async function saveClinicianNotes(
  applicationId: string,
  notes: string
): Promise<ActionResult> {
  const client = requireSupabase();
  const { error } = await client
    .from('patient_applications')
    .update({
      clinician_notes: notes.trim(),
    })
    .eq('id', applicationId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Notes saved.',
  };
}

export async function createScreeningRequest(
  applicationId: string,
  draft: ClinicianRequestDraft
): Promise<ActionResult> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from('screening_requests')
    .insert({
      application_id: applicationId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      due_label: draft.dueLabel.trim() || 'No deadline',
      status: 'open',
      patient_response: '',
    });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await client
    .from('patient_applications')
    .update({
      status: 'info_requested',
      last_status_at: now,
    })
    .eq('id', applicationId);

  return {
    ok: true,
    message: 'Request sent.',
  };
}

export async function scheduleCall(
  applicationId: string,
  draft: ScheduleCallDraft
): Promise<ActionResult> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from('patient_applications')
    .update({
      status: 'scheduled_call',
      scheduled_call_at: draft.scheduledFor.trim(),
      scheduled_call_reason: draft.note.trim(),
      last_status_at: now,
    })
    .eq('id', applicationId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Call scheduled.',
  };
}
