import type {
  ClinicianProfile,
  ClinicianRequestDraft,
  PatientApplication,
  PatientApplicationDraft,
  ScheduleCallDraft,
  ScreeningRequest,
  StudyDraft,
  StudyProgram,
  StudyPulseData,
} from '../types/studypulse';

export const defaultApplicationDraft: PatientApplicationDraft = {
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

export const defaultClinicianRequestDraft: ClinicianRequestDraft = {
  title: '',
  body: '',
  dueLabel: 'Due in 48 hours',
};

export const defaultScheduleCallDraft: ScheduleCallDraft = {
  scheduledFor: '',
  note: '',
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
  studyType: 'Screening study',
  recruitStatus: 'open',
};

export const mockStudies: StudyProgram[] = [
  {
    id: 'study-heart',
    slug: 'heartwell-remote-screening',
    title: 'HeartWell Remote Screening Trial',
    condition: 'Heart palpitations and rhythm monitoring',
    shortDescription:
      'Hybrid trial for adults with recurring rhythm symptoms who can share wearable data.',
    description:
      'This study screens adults with recurring palpitations or irregular heart rhythm symptoms. Participants complete an intake review, a short eligibility call, and hybrid follow-ups.',
    eligibilitySummary:
      'Adults 18-65 in Ohio or Kentucky with recurring heart-related symptoms.',
    requirements:
      'Participants should have recurring symptoms, reliable phone access, and availability for one screening call plus follow-up visits.',
    ageMin: 18,
    ageMax: 65,
    locationLabel: 'Cincinnati clinic + remote follow-ups',
    locationType: 'hybrid',
    medicationsExclusions:
      'Some antiarrhythmic medications may require extra review.',
    availabilityRequirements:
      'One 10-minute screening call and flexible weekday availability.',
    timeCommitment: '1 intake call, 1 clinic visit, 2 remote check-ins',
    studyType: 'Cardiology screening',
    recruitStatus: 'open',
    createdAt: '2026-03-27T12:00:00.000Z',
  },
  {
    id: 'study-migraine',
    slug: 'calmwave-migraine-study',
    title: 'CalmWave Migraine Prevention Study',
    condition: 'Migraines and recurring severe headaches',
    shortDescription:
      'Remote-first study evaluating preventive care patterns for adults with frequent migraines.',
    description:
      'This remote-first study is for adults experiencing frequent migraines who want to join a structured screening and follow-up program.',
    eligibilitySummary:
      'Adults 18-55 with frequent migraines and reliable smartphone access.',
    requirements:
      'Participants should be able to complete remote questionnaires and one telehealth screening call.',
    ageMin: 18,
    ageMax: 55,
    locationLabel: 'Remote participation',
    locationType: 'remote',
    medicationsExclusions:
      'Recent medication changes may require coordinator review.',
    availabilityRequirements:
      'One telehealth screening call and weekly digital follow-ups.',
    timeCommitment: '1 telehealth screening call, 4 weekly follow-ups',
    studyType: 'Neurology screening',
    recruitStatus: 'open',
    createdAt: '2026-03-26T09:00:00.000Z',
  },
];

export const mockClinician: ClinicianProfile = {
  id: 'clinician-lena',
  fullName: 'Dr. Lena Patel',
  title: 'Clinical Research Lead',
  siteName: 'StudyPulse Research Network',
  email: 'lena@studypulse.tech',
};

export const mockApplications: PatientApplication[] = [
  {
    id: 'app-riley',
    studyId: 'study-heart',
    fullName: 'Riley Carter',
    age: 24,
    city: 'Cincinnati',
    state: 'OH',
    phone: '(513) 555-0142',
    email: 'riley@demo.com',
    condition: 'Palpitations after exercise',
    currentMedications: 'None currently',
    availability: 'Weekday evenings and Saturdays',
    motivation:
      'I want a structured screening path and I am comfortable sharing wearable data.',
    status: 'info_requested',
    clinicianNotes:
      'Strong fit so far. Need one more history clarification before final eligibility call.',
    scheduledCallAt: null,
    scheduledCallReason: '',
    createdAt: '2026-03-27T18:30:00.000Z',
    updatedAt: '2026-03-28T14:10:00.000Z',
    lastStatusAt: '2026-03-28T14:10:00.000Z',
  },
  {
    id: 'app-jordan',
    studyId: 'study-heart',
    fullName: 'Jordan Kim',
    age: 29,
    city: 'Lexington',
    state: 'KY',
    phone: '(859) 555-0197',
    email: 'jordan@demo.com',
    condition: 'Post-COVID heart rate variability concerns',
    currentMedications: 'Low-dose beta blocker',
    availability: 'Flexible after 1 PM',
    motivation:
      'Looking for a structured screening program and willing to do remote follow-ups.',
    status: 'eligible',
    clinicianNotes: 'Eligible. Schedule the consent call.',
    scheduledCallAt: null,
    scheduledCallReason: '',
    createdAt: '2026-03-26T16:00:00.000Z',
    updatedAt: '2026-03-28T12:20:00.000Z',
    lastStatusAt: '2026-03-28T12:20:00.000Z',
  },
  {
    id: 'app-morgan',
    studyId: 'study-migraine',
    fullName: 'Morgan Lee',
    age: 31,
    city: 'Columbus',
    state: 'OH',
    phone: '(614) 555-0118',
    email: 'morgan@demo.com',
    condition: 'Frequent migraines with aura',
    currentMedications: 'Magnesium supplement',
    availability: 'Remote visits before work',
    motivation:
      'I want to better understand triggers and contribute to migraine research.',
    status: 'under_review',
    clinicianNotes: '',
    scheduledCallAt: null,
    scheduledCallReason: '',
    createdAt: '2026-03-28T09:15:00.000Z',
    updatedAt: '2026-03-28T15:45:00.000Z',
    lastStatusAt: '2026-03-28T15:45:00.000Z',
  },
];

export const mockRequests: ScreeningRequest[] = [
  {
    id: 'req-riley-1',
    applicationId: 'app-riley',
    title: 'Confirm symptom timing',
    body:
      'Please tell us when the palpitations usually happen, how long they last, and whether anything makes them better or worse.',
    dueLabel: 'Due tonight',
    status: 'open',
    patientResponse: '',
    createdAt: '2026-03-28T13:45:00.000Z',
    respondedAt: null,
  },
  {
    id: 'req-riley-2',
    applicationId: 'app-riley',
    title: 'Upload wearable summary',
    body:
      'Send your recent watch heart-rate summary so we can compare your symptoms against your baseline.',
    dueLabel: 'Completed',
    status: 'responded',
    patientResponse:
      'Uploaded screenshots from the last 7 days. The spikes mostly happen after basketball.',
    createdAt: '2026-03-27T20:00:00.000Z',
    respondedAt: '2026-03-28T09:12:00.000Z',
  },
];

export const mockStudyPulseData: StudyPulseData = {
  studies: mockStudies,
  clinician: mockClinician,
  applications: mockApplications,
  requests: mockRequests,
};
