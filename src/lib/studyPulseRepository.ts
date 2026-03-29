import {
  defaultStudyDraft,
  mockStudyPulseData,
} from '../data/studypulseMockData';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  AccountRole,
  ActionResult,
  ApplicationStatus,
  AuthSignInDraft,
  AuthSignUpDraft,
  ClinicianRequestDraft,
  PatientApplication,
  PatientApplicationDraft,
  ScheduleCallDraft,
  ScreeningRequest,
  StudyDraft,
  StudyPulseProfile,
  StudyProgram,
  StudyPulseData,
  StudyPulseSource,
} from '../types/studypulse';

const LOCAL_DB_KEY = 'studypulse:product-db:v2';
const LOCAL_PATIENT_EMAIL_KEY = 'studypulse:patient-email';

type StudyRow = {
  age_max: number;
  age_min: number;
  availability_requirements: string | null;
  condition: string;
  created_at: string;
  description: string | null;
  eligibility_summary: string | null;
  id: string;
  location_label: string | null;
  location_type: StudyProgram['locationType'];
  medications_exclusions: string | null;
  recruit_status: StudyProgram['recruitStatus'];
  requirements: string | null;
  short_description: string | null;
  slug: string;
  study_type: string | null;
  time_commitment: string | null;
  title: string;
};

type ClinicianRow = {
  email: string;
  full_name: string;
  id: string;
  site_name: string;
  title: string;
};

type ProfileRow = {
  city: string;
  email: string;
  full_name: string;
  id: string;
  phone: string;
  role: AccountRole;
  site_name: string;
  state: string;
  title: string;
};

type ApplicationRow = {
  age: number;
  auth_user_id: string | null;
  availability: string | null;
  city: string;
  clinician_notes: string | null;
  condition: string | null;
  created_at: string;
  current_medications: string | null;
  email: string;
  full_name: string;
  id: string;
  last_status_at: string | null;
  motivation: string | null;
  phone: string;
  scheduled_call_at: string | null;
  scheduled_call_reason: string | null;
  state: string;
  status: ApplicationStatus;
  study_id: string;
  updated_at: string;
};

type RequestRow = {
  application_id: string;
  body: string;
  created_at: string;
  due_label: string | null;
  id: string;
  patient_response: string | null;
  responded_at: string | null;
  status: ScreeningRequest['status'];
  title: string;
};

type LoadResult = {
  data: StudyPulseData;
  error?: string;
  source: StudyPulseSource;
};

type LocalDb = StudyPulseData;

function nowIso() {
  return new Date().toISOString();
}

function cloneMockData(): LocalDb {
  return JSON.parse(JSON.stringify(mockStudyPulseData)) as LocalDb;
}

function readLocalDb(): LocalDb {
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_DB_KEY);

    if (!raw) {
      const initial = cloneMockData();
      writeLocalDb(initial);
      return initial;
    }

    return JSON.parse(raw) as LocalDb;
  } catch {
    return cloneMockData();
  }
}

function writeLocalDb(data: LocalDb) {
  globalThis.localStorage.setItem(
    LOCAL_DB_KEY,
    JSON.stringify(data)
  );
}

function sortStudies(studies: StudyProgram[]) {
  return [...studies].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

function sortApplications(
  applications: PatientApplication[]
) {
  return [...applications].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

function sortRequests(requests: ScreeningRequest[]) {
  return [...requests].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

function formatStatusMessage(status: ApplicationStatus) {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under review';
    case 'info_requested':
      return 'Needs more info';
    case 'eligible':
      return 'Eligible';
    case 'not_eligible':
      return 'Not eligible';
    case 'scheduled_call':
      return 'Call scheduled';
    default:
      return 'Updated';
  }
}

function validateApplicationDraft(
  draft: PatientApplicationDraft
) {
  return (
    draft.fullName.trim() &&
    draft.age.trim() &&
    draft.city.trim() &&
    draft.state.trim() &&
    draft.phone.trim() &&
    draft.email.trim() &&
    draft.condition.trim() &&
    draft.availability.trim() &&
    draft.motivation.trim()
  );
}

function validateStudyDraft(draft: StudyDraft) {
  return (
    draft.title.trim() &&
    draft.condition.trim() &&
    draft.shortDescription.trim() &&
    draft.description.trim() &&
    draft.eligibilitySummary.trim() &&
    draft.requirements.trim() &&
    draft.ageMin.trim() &&
    draft.ageMax.trim() &&
    draft.locationLabel.trim() &&
    draft.timeCommitment.trim()
  );
}

function mapStudyRow(row: StudyRow): StudyProgram {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    eligibilitySummary: row.eligibility_summary ?? '',
    requirements: row.requirements ?? '',
    ageMin: row.age_min,
    ageMax: row.age_max,
    locationLabel: row.location_label ?? '',
    locationType: row.location_type,
    medicationsExclusions: row.medications_exclusions ?? '',
    availabilityRequirements:
      row.availability_requirements ?? '',
    timeCommitment: row.time_commitment ?? '',
    studyType: row.study_type ?? 'Clinical study',
    recruitStatus: row.recruit_status,
    createdAt: row.created_at,
  };
}

function mapClinicianRow(row: ClinicianRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    title: row.title,
    siteName: row.site_name,
    email: row.email,
  };
}

function mapProfileRow(row: ProfileRow): StudyPulseProfile {
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

function mapApplicationRow(
  row: ApplicationRow
): PatientApplication {
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
    condition: row.condition ?? '',
    currentMedications: row.current_medications ?? '',
    availability: row.availability ?? '',
    motivation: row.motivation ?? '',
    status: row.status,
    clinicianNotes: row.clinician_notes ?? '',
    scheduledCallAt: row.scheduled_call_at,
    scheduledCallReason: row.scheduled_call_reason ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastStatusAt: row.last_status_at ?? row.updated_at,
  };
}

function mapRequestRow(row: RequestRow): ScreeningRequest {
  return {
    id: row.id,
    applicationId: row.application_id,
    title: row.title,
    body: row.body,
    dueLabel: row.due_label ?? 'No deadline',
    status: row.status,
    patientResponse: row.patient_response ?? '',
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

function buildStudyFromDraft(
  draft: StudyDraft,
  existing?: StudyProgram
): StudyProgram {
  const timestamp = nowIso();
  const title = draft.title.trim();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    id: existing?.id ?? `study-${Date.now()}`,
    slug:
      existing?.slug ??
      slug ??
      `study-${Date.now()}`,
    title,
    condition: draft.condition.trim(),
    shortDescription: draft.shortDescription.trim(),
    description: draft.description.trim(),
    eligibilitySummary: draft.eligibilitySummary.trim(),
    requirements: draft.requirements.trim(),
    ageMin: Number(draft.ageMin),
    ageMax: Number(draft.ageMax),
    locationLabel: draft.locationLabel.trim(),
    locationType: draft.locationType,
    medicationsExclusions: draft.medicationsExclusions.trim(),
    availabilityRequirements:
      draft.availabilityRequirements.trim(),
    timeCommitment: draft.timeCommitment.trim(),
    studyType: draft.studyType.trim() || defaultStudyDraft.studyType,
    recruitStatus: draft.recruitStatus,
    createdAt: existing?.createdAt ?? timestamp,
  };
}

function buildApplicationFromDraft(
  draft: PatientApplicationDraft,
  studyId: string,
  existing?: PatientApplication,
  authUserId?: string | null
): PatientApplication {
  const timestamp = nowIso();

  return {
    id: existing?.id ?? `app-${Date.now()}`,
    studyId,
    authUserId: existing?.authUserId ?? authUserId ?? null,
    fullName: draft.fullName.trim(),
    age: Number(draft.age),
    city: draft.city.trim(),
    state: draft.state.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim().toLowerCase(),
    condition: draft.condition.trim(),
    currentMedications: draft.currentMedications.trim(),
    availability: draft.availability.trim(),
    motivation: draft.motivation.trim(),
    status: existing?.status ?? 'submitted',
    clinicianNotes: existing?.clinicianNotes ?? '',
    scheduledCallAt: existing?.scheduledCallAt ?? null,
    scheduledCallReason:
      existing?.scheduledCallReason ?? '',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastStatusAt: existing?.lastStatusAt ?? timestamp,
  };
}

export function readStoredPatientEmail() {
  try {
    return globalThis.localStorage.getItem(
      LOCAL_PATIENT_EMAIL_KEY
    );
  } catch {
    return null;
  }
}

export function writeStoredPatientEmail(
  email: string | null
) {
  if (email) {
    globalThis.localStorage.setItem(
      LOCAL_PATIENT_EMAIL_KEY,
      email
    );
    return;
  }

  globalThis.localStorage.removeItem(LOCAL_PATIENT_EMAIL_KEY);
}

export async function fetchStudyPulseProfile(
  userId: string
): Promise<StudyPulseProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, role, email, full_name, phone, city, state, site_name, title'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfileRow(data as ProfileRow) : null;
}

export async function bootstrapStudyPulseProfile(): Promise<StudyPulseProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    'bootstrap_profile'
  );

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapProfileRow(row as ProfileRow) : null;
}

export async function signInStudyPulseAccount(
  draft: AuthSignInDraft
): Promise<ActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured.',
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
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

export async function signUpStudyPulseAccount(
  draft: AuthSignUpDraft
): Promise<ActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: 'Supabase Auth is not configured.',
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    options: {
      data: {
        role: draft.role,
        full_name: draft.fullName.trim(),
        phone: draft.phone.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        site_name: draft.siteName.trim(),
        title: draft.title.trim(),
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data.session) {
    return {
      ok: true,
      message:
        'Account created. Check your email to confirm it, then sign in.',
    };
  }

  return {
    ok: true,
    message: 'Account created and signed in.',
  };
}

export async function signOutStudyPulseAccount(): Promise<ActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    writeStoredPatientEmail(null);
    return {
      ok: true,
      message: 'Signed out.',
    };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  writeStoredPatientEmail(null);

  return {
    ok: true,
    message: 'Signed out.',
  };
}

export async function loadStudyPulseData(): Promise<LoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: readLocalDb(),
      error:
        'Supabase is not configured, so StudyPulse is using local data.',
      source: 'demo',
    };
  }

  try {
    const [studiesResult, clinicianResult, applicationsResult, requestsResult] =
      await Promise.all([
        supabase
          .from('study_programs')
          .select(
            'id, slug, title, condition, short_description, description, eligibility_summary, requirements, age_min, age_max, location_label, location_type, medications_exclusions, availability_requirements, time_commitment, study_type, recruit_status, created_at'
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('clinicians')
          .select('id, full_name, title, site_name, email')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('patient_applications')
          .select(
            'id, study_id, auth_user_id, full_name, age, city, state, phone, email, condition, current_medications, availability, motivation, status, clinician_notes, scheduled_call_at, scheduled_call_reason, last_status_at, created_at, updated_at'
          )
          .order('updated_at', { ascending: false }),
        supabase
          .from('screening_requests')
          .select(
            'id, application_id, title, body, due_label, status, patient_response, created_at, responded_at'
          )
          .order('created_at', { ascending: false }),
      ]);

    const error =
      studiesResult.error ??
      clinicianResult.error ??
      applicationsResult.error ??
      requestsResult.error;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: {
        studies: sortStudies(
          ((studiesResult.data ?? []) as StudyRow[]).map(
            mapStudyRow
          )
        ),
        clinician: clinicianResult.data
          ? mapClinicianRow(
              clinicianResult.data as ClinicianRow
            )
          : null,
        applications: sortApplications(
          ((applicationsResult.data ?? []) as ApplicationRow[]).map(
            mapApplicationRow
          )
        ),
        requests: sortRequests(
          ((requestsResult.data ?? []) as RequestRow[]).map(
            mapRequestRow
          )
        ),
      },
      source: 'supabase',
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load StudyPulse.';

    return {
      data: readLocalDb(),
      error: `${message} Falling back to local data.`,
      source: 'demo',
    };
  }
}

export async function savePatientApplication(
  draft: PatientApplicationDraft,
  studyId: string,
  existing?: PatientApplication
): Promise<ActionResult> {
  const normalizedAge = Number(draft.age.trim());

  if (!validateApplicationDraft(draft)) {
    return {
      ok: false,
      message: 'Complete the application before submitting it.',
    };
  }

  if (
    Number.isNaN(normalizedAge) ||
    normalizedAge < 18 ||
    normalizedAge > 120
  ) {
    return {
      ok: false,
      message: 'Enter a valid age between 18 and 120.',
    };
  }

  const currentSession =
    isSupabaseConfigured && supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
  const normalizedEmail =
    currentSession?.user.email?.trim().toLowerCase() ??
    draft.email.trim().toLowerCase();

  const nextApplication = {
    ...buildApplicationFromDraft(
      {
        ...draft,
        email: normalizedEmail,
      },
      studyId,
      existing,
      currentSession?.user.id ?? null
    ),
    email: normalizedEmail,
  };

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    const nextApplications = sortApplications([
      nextApplication,
      ...db.applications.filter(
        (application) => application.id !== nextApplication.id
      ),
    ]);

    writeLocalDb({
      ...db,
      applications: nextApplications,
    });

    writeStoredPatientEmail(nextApplication.email);

    return {
      ok: true,
      message: existing
        ? 'Application updated.'
        : 'Application submitted.',
      applicationId: nextApplication.id,
      patientEmail: nextApplication.email,
    };
  }

  const payload = {
    study_id: studyId,
    auth_user_id: nextApplication.authUserId,
    full_name: nextApplication.fullName,
    age: nextApplication.age,
    city: nextApplication.city,
    state: nextApplication.state,
    phone: nextApplication.phone,
    email: nextApplication.email,
    condition: nextApplication.condition,
    current_medications: nextApplication.currentMedications,
    availability: nextApplication.availability,
    motivation: nextApplication.motivation,
    status: nextApplication.status,
    clinician_notes: nextApplication.clinicianNotes,
    scheduled_call_at: nextApplication.scheduledCallAt,
    scheduled_call_reason:
      nextApplication.scheduledCallReason,
    last_status_at: nextApplication.lastStatusAt,
  };

  const query = existing
    ? supabase
        .from('patient_applications')
        .update(payload)
        .eq('id', existing.id)
        .select('id, email')
        .single()
    : supabase
        .from('patient_applications')
        .insert(payload)
        .select('id, email')
        .single();

  const { data, error } = await query;

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result = data as {
    email: string;
    id: string;
  };

  writeStoredPatientEmail(result.email);

  return {
    ok: true,
    message: existing
      ? 'Application updated.'
      : 'Application submitted.',
    applicationId: result.id,
    patientEmail: result.email,
  };
}

export async function restorePatientSession(
  email: string
): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return {
      ok: false,
      message: 'Enter your email to restore your applications.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const match = readLocalDb().applications.some(
      (application) => application.email === normalized
    );

    if (!match) {
      return {
        ok: false,
        message: 'No applications were found for that email.',
      };
    }

    writeStoredPatientEmail(normalized);

    return {
      ok: true,
      message: 'Applications restored.',
      patientEmail: normalized,
    };
  }

  const { data, error } = await supabase
    .from('patient_applications')
    .select('id')
    .eq('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      message: 'No applications were found for that email.',
    };
  }

  writeStoredPatientEmail(normalized);

  return {
    ok: true,
    message: 'Applications restored.',
    patientEmail: normalized,
  };
}

export async function respondToRequest(
  requestId: string,
  response: string
): Promise<ActionResult> {
  const nextResponse = response.trim();

  if (!nextResponse) {
    return {
      ok: false,
      message: 'Add a response before sending it.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    const request = db.requests.find(
      (item) => item.id === requestId
    );

    if (!request) {
      return {
        ok: false,
        message: 'That request could not be found.',
      };
    }

    const updatedAt = nowIso();
    const nextRequests = sortRequests(
      db.requests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              patientResponse: nextResponse,
              respondedAt: updatedAt,
              status: 'responded',
            }
          : item
      )
    );

    const nextApplications = sortApplications(
      db.applications.map((application) =>
        application.id === request.applicationId
          ? {
              ...application,
              status:
                application.status === 'info_requested'
                  ? 'under_review'
                  : application.status,
              updatedAt,
              lastStatusAt: updatedAt,
            }
          : application
      )
    );

    writeLocalDb({
      ...db,
      applications: nextApplications,
      requests: nextRequests,
    });

    return {
      ok: true,
      message: 'Response sent.',
    };
  }

  const updatedAt = nowIso();
  const requestResult = await supabase
    .from('screening_requests')
    .update({
      patient_response: nextResponse,
      responded_at: updatedAt,
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

  await supabase
    .from('patient_applications')
    .update({
      status: 'under_review',
      updated_at: updatedAt,
      last_status_at: updatedAt,
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
  if (!validateStudyDraft(draft)) {
    return {
      ok: false,
      message: 'Complete the study form before publishing it.',
    };
  }

  const study = buildStudyFromDraft(draft);

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    writeLocalDb({
      ...db,
      studies: sortStudies([study, ...db.studies]),
    });

    return {
      ok: true,
      message: 'Study published.',
      studyId: study.id,
    };
  }

  const { data, error } = await supabase
    .from('study_programs')
    .insert({
      slug: study.slug,
      title: study.title,
      condition: study.condition,
      short_description: study.shortDescription,
      description: study.description,
      eligibility_summary: study.eligibilitySummary,
      requirements: study.requirements,
      age_min: study.ageMin,
      age_max: study.ageMax,
      location_label: study.locationLabel,
      location_type: study.locationType,
      medications_exclusions: study.medicationsExclusions,
      availability_requirements:
        study.availabilityRequirements,
      time_commitment: study.timeCommitment,
      study_type: study.studyType,
      recruit_status: study.recruitStatus,
    })
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
    message: 'Study published.',
    studyId: (data as { id: string }).id,
  };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const statusTime = nowIso();

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    writeLocalDb({
      ...db,
      applications: sortApplications(
        db.applications.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                status,
                updatedAt: statusTime,
                lastStatusAt: statusTime,
              }
            : application
        )
      ),
    });

    return {
      ok: true,
      message: `${formatStatusMessage(status)}.`,
    };
  }

  const { error } = await supabase
    .from('patient_applications')
    .update({
      status,
      updated_at: statusTime,
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
    message: `${formatStatusMessage(status)}.`,
  };
}

export async function saveClinicianNotes(
  applicationId: string,
  notes: string
): Promise<ActionResult> {
  const updatedAt = nowIso();

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    writeLocalDb({
      ...db,
      applications: sortApplications(
        db.applications.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                clinicianNotes: notes,
                updatedAt,
              }
            : application
        )
      ),
    });

    return {
      ok: true,
      message: 'Notes saved.',
    };
  }

  const { error } = await supabase
    .from('patient_applications')
    .update({
      clinician_notes: notes,
      updated_at: updatedAt,
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
  if (!draft.title.trim() || !draft.body.trim()) {
    return {
      ok: false,
      message: 'Add a title and request before sending it.',
    };
  }

  const createdAt = nowIso();
  const nextRequest: ScreeningRequest = {
    id: `req-${Date.now()}`,
    applicationId,
    title: draft.title.trim(),
    body: draft.body.trim(),
    dueLabel: draft.dueLabel.trim() || 'No deadline',
    status: 'open',
    patientResponse: '',
    createdAt,
    respondedAt: null,
  };

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    writeLocalDb({
      ...db,
      requests: sortRequests([nextRequest, ...db.requests]),
      applications: sortApplications(
        db.applications.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                status: 'info_requested',
                updatedAt: createdAt,
                lastStatusAt: createdAt,
              }
            : application
        )
      ),
    });

    return {
      ok: true,
      message: 'Request sent to patient.',
    };
  }

  const requestResult = await supabase
    .from('screening_requests')
    .insert({
      application_id: applicationId,
      title: nextRequest.title,
      body: nextRequest.body,
      due_label: nextRequest.dueLabel,
      status: 'open',
      patient_response: '',
    });

  if (requestResult.error) {
    return {
      ok: false,
      message: requestResult.error.message,
    };
  }

  await supabase
    .from('patient_applications')
    .update({
      status: 'info_requested',
      updated_at: createdAt,
      last_status_at: createdAt,
    })
    .eq('id', applicationId);

  return {
    ok: true,
    message: 'Request sent to patient.',
  };
}

export async function scheduleCall(
  applicationId: string,
  draft: ScheduleCallDraft
): Promise<ActionResult> {
  if (!draft.scheduledFor.trim()) {
    return {
      ok: false,
      message: 'Add a call time before scheduling it.',
    };
  }

  const updatedAt = nowIso();

  if (!isSupabaseConfigured || !supabase) {
    const db = readLocalDb();
    writeLocalDb({
      ...db,
      applications: sortApplications(
        db.applications.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                status: 'scheduled_call',
                scheduledCallAt: draft.scheduledFor.trim(),
                scheduledCallReason: draft.note.trim(),
                updatedAt,
                lastStatusAt: updatedAt,
              }
            : application
        )
      ),
    });

    return {
      ok: true,
      message: 'Call scheduled.',
    };
  }

  const { error } = await supabase
    .from('patient_applications')
    .update({
      status: 'scheduled_call',
      scheduled_call_at: draft.scheduledFor.trim(),
      scheduled_call_reason: draft.note.trim(),
      updated_at: updatedAt,
      last_status_at: updatedAt,
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
