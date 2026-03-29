export type StudyPulseRole =
  | 'landing'
  | 'patient'
  | 'clinician';

export type AccountRole = 'patient' | 'clinician';

export type StudyPulseSource = 'demo' | 'supabase';

export type FeedbackTone = 'success' | 'warning';

export type StudyLocationType =
  | 'remote'
  | 'hybrid'
  | 'in_person';

export type StudyRecruitStatus = 'open' | 'closed';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'info_requested'
  | 'eligible'
  | 'not_eligible'
  | 'scheduled_call';

export type ScreeningRequestStatus =
  | 'open'
  | 'responded'
  | 'closed';

export type StudyProgram = {
  ageMax: number;
  ageMin: number;
  availabilityRequirements: string;
  condition: string;
  createdAt: string;
  description: string;
  eligibilitySummary: string;
  id: string;
  locationLabel: string;
  locationType: StudyLocationType;
  medicationsExclusions: string;
  recruitStatus: StudyRecruitStatus;
  requirements: string;
  shortDescription: string;
  slug: string;
  studyType: string;
  timeCommitment: string;
  title: string;
};

export type StudyDraft = {
  ageMax: string;
  ageMin: string;
  availabilityRequirements: string;
  condition: string;
  description: string;
  eligibilitySummary: string;
  locationLabel: string;
  locationType: StudyLocationType;
  medicationsExclusions: string;
  recruitStatus: StudyRecruitStatus;
  requirements: string;
  shortDescription: string;
  studyType: string;
  timeCommitment: string;
  title: string;
};

export type ClinicianProfile = {
  email: string;
  fullName: string;
  id: string;
  siteName: string;
  title: string;
};

export type StudyPulseProfile = {
  city: string;
  email: string;
  fullName: string;
  id: string;
  phone: string;
  role: AccountRole;
  siteName: string;
  state: string;
  title: string;
};

export type PatientApplication = {
  age: number;
  authUserId: string | null;
  availability: string;
  city: string;
  clinicianNotes: string;
  condition: string;
  createdAt: string;
  currentMedications: string;
  email: string;
  fullName: string;
  id: string;
  lastStatusAt: string;
  motivation: string;
  phone: string;
  scheduledCallAt: string | null;
  scheduledCallReason: string;
  state: string;
  status: ApplicationStatus;
  studyId: string;
  updatedAt: string;
};

export type PatientApplicationDraft = {
  age: string;
  availability: string;
  city: string;
  condition: string;
  currentMedications: string;
  email: string;
  fullName: string;
  motivation: string;
  phone: string;
  state: string;
};

export type ScreeningRequest = {
  applicationId: string;
  body: string;
  createdAt: string;
  dueLabel: string;
  id: string;
  patientResponse: string;
  respondedAt: string | null;
  status: ScreeningRequestStatus;
  title: string;
};

export type ClinicianRequestDraft = {
  body: string;
  dueLabel: string;
  title: string;
};

export type ScheduleCallDraft = {
  note: string;
  scheduledFor: string;
};

export type AuthSignInDraft = {
  email: string;
  password: string;
};

export type AuthSignUpDraft = {
  city: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
  role: AccountRole;
  siteName: string;
  state: string;
  title: string;
};

export type StudyPulseData = {
  applications: PatientApplication[];
  clinician: ClinicianProfile | null;
  requests: ScreeningRequest[];
  studies: StudyProgram[];
};

export type ActionResult = {
  applicationId?: string;
  message: string;
  ok: boolean;
  patientEmail?: string;
  studyId?: string;
};
