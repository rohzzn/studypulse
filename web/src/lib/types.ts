export type PortalRole = 'patient' | 'clinician';

export type ThemeMode = 'light' | 'dark';

export type FeedbackTone = 'success' | 'warning';

export type StudyLocationType =
  | 'remote'
  | 'hybrid'
  | 'in_person';

export type StudyRecruitStatus = 'open' | 'closed';

export type StudyMatchStatus =
  | 'likely_fit'
  | 'possible_fit'
  | 'review_needed'
  | 'not_a_fit';

export type ApplicantMatchStatus = StudyMatchStatus;

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

export type Profile = {
  id: string;
  role: PortalRole;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  state: string;
  siteName: string;
  title: string;
};

export type StudyProgram = {
  id: string;
  slug: string;
  title: string;
  condition: string;
  shortDescription: string;
  description: string;
  eligibilitySummary: string;
  requirements: string;
  ageMin: number;
  ageMax: number;
  locationLabel: string;
  locationType: StudyLocationType;
  medicationsExclusions: string;
  availabilityRequirements: string;
  timeCommitment: string;
  studyType: string;
  recruitStatus: StudyRecruitStatus;
  createdAt: string;
};

export type StudyMatchResult = {
  studyId: string;
  status: StudyMatchStatus;
  score: number;
  reason: string;
  caution: string;
};

export type StudyMatchResponse = {
  matches: StudyMatchResult[];
  source: 'gemini' | 'local';
};

export type ApplicantMatchResult = {
  applicationId: string;
  status: ApplicantMatchStatus;
  score: number;
  reason: string;
  caution: string;
};

export type ApplicantMatchResponse = {
  matches: ApplicantMatchResult[];
  source: 'gemini' | 'local';
};

export type StudyDraft = {
  title: string;
  condition: string;
  shortDescription: string;
  description: string;
  eligibilitySummary: string;
  requirements: string;
  ageMin: string;
  ageMax: string;
  locationLabel: string;
  locationType: StudyLocationType;
  medicationsExclusions: string;
  availabilityRequirements: string;
  timeCommitment: string;
  studyType: string;
  recruitStatus: StudyRecruitStatus;
};

export type PatientApplication = {
  id: string;
  studyId: string;
  authUserId: string | null;
  fullName: string;
  age: number;
  city: string;
  state: string;
  phone: string;
  email: string;
  condition: string;
  currentMedications: string;
  availability: string;
  motivation: string;
  status: ApplicationStatus;
  clinicianNotes: string;
  scheduledCallAt: string | null;
  scheduledCallReason: string;
  lastStatusAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationDraft = {
  fullName: string;
  age: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  condition: string;
  currentMedications: string;
  availability: string;
  motivation: string;
};

export type ScreeningRequest = {
  id: string;
  applicationId: string;
  title: string;
  body: string;
  dueLabel: string;
  status: ScreeningRequestStatus;
  patientResponse: string;
  respondedAt: string | null;
  createdAt: string;
};

export type ClinicianRequestDraft = {
  title: string;
  body: string;
  dueLabel: string;
};

export type ScheduleCallDraft = {
  scheduledFor: string;
  note: string;
};

export type AuthSignUpInput = {
  email: string;
  password: string;
  role: PortalRole;
  fullName: string;
  phone: string;
  city: string;
  state: string;
  siteName: string;
  title: string;
};

export type AuthSignInInput = {
  email: string;
  password: string;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export const defaultApplicationDraft: ApplicationDraft = {
  fullName: '',
  age: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  condition: '',
  currentMedications: '',
  availability: '',
  motivation: '',
};

export const defaultStudyDraft: StudyDraft = {
  title: '',
  condition: '',
  shortDescription: '',
  description: '',
  eligibilitySummary: '',
  requirements: '',
  ageMin: '18',
  ageMax: '65',
  locationLabel: '',
  locationType: 'hybrid',
  medicationsExclusions: '',
  availabilityRequirements: '',
  timeCommitment: '',
  studyType: 'Clinical study',
  recruitStatus: 'open',
};

export const defaultClinicianRequestDraft: ClinicianRequestDraft = {
  title: '',
  body: '',
  dueLabel: 'Due in 48 hours',
};

export const defaultScheduleCallDraft: ScheduleCallDraft = {
  scheduledFor: '',
  note: '',
};
