import type {
  DailyCheckInDraft,
  TrialData,
} from '../types/trial';

export const defaultCheckInDraft: DailyCheckInDraft = {
  medicationTaken: null,
  energyLevel: null,
  stressLevel: 3,
  symptoms: [],
  note: '',
  supportRequested: false,
};

export const mockTrialData: TrialData = {
  participant: {
    id: 'participant-demo',
    firstName: 'Maya',
    studyName: 'CardioTrack Phase II',
    cohort: 'Remote monitoring cohort',
    coordinatorName: 'Avery Chen',
    coordinatorNote:
      'Your data looked steady after last night. If dizziness returns, ask for support in the check-in and the site will follow up quickly.',
    nextVisitLabel: 'Sun, Mar 29 at 10:30 AM',
    nextDoseLabel: 'Tonight at 8:00 PM',
  },
  todaysFocus:
    'Keep the participant day lightweight: one medication reminder, one symptom check-in, one clear visit-prep message.',
  sponsorFit:
    'This concept improves trial retention, surfaces adverse-event signals faster, and gives coordinators a cleaner operational view with minimal participant friction.',
  trendSummary: {
    adherencePercent: 94,
    checkInsCompleted: 6,
    checkInsTarget: 7,
    signalLabel: 'Stable',
    responseTimeLabel: '< 2h',
  },
  metrics: [
    {
      id: 'adherence',
      label: 'Medication adherence',
      value: '94%',
      caption: 'Rolling 7-day completion',
      tone: 'mint',
    },
    {
      id: 'visit-readiness',
      label: 'Visit readiness',
      value: '3/4',
      caption: 'Prep steps already complete',
      tone: 'blue',
    },
    {
      id: 'risk-status',
      label: 'Risk status',
      value: 'Stable',
      caption: 'No urgent sponsor signals',
      tone: 'amber',
    },
    {
      id: 'response-time',
      label: 'Coordinator response',
      value: '<2h',
      caption: 'Average escalation follow-up',
      tone: 'rose',
    },
  ],
  tasks: [
    {
      id: 'task-checkin',
      title: 'Complete today\'s symptom check-in',
      detail: 'Needed before sponsor review at noon.',
      status: 'attention',
      dueLabel: 'Due by 11:00 AM',
    },
    {
      id: 'task-medication',
      title: 'Evening medication dose',
      detail: 'Take with food and confirm in the app.',
      status: 'upcoming',
      dueLabel: '8:00 PM',
    },
    {
      id: 'task-visit',
      title: 'Charge smartwatch and pack study ID',
      detail: 'Helps the site team capture uninterrupted vitals.',
      status: 'upcoming',
      dueLabel: 'Tonight',
    },
    {
      id: 'task-labs',
      title: 'Baseline lab upload confirmed',
      detail: 'File already synced for tomorrow\'s visit.',
      status: 'done',
      dueLabel: 'Completed',
    },
  ],
  visits: [
    {
      id: 'visit-1',
      title: 'Week 02 site visit',
      dateLabel: 'Sun, Mar 29',
      timeLabel: '10:30 AM',
      location: '1819 Innovation Hub, Room 320',
      status: 'confirmed',
      prepSummary:
        'Bring your study wristband, a photo ID, and note any symptoms that changed overnight.',
      checklist: [
        'Bring smartwatch and charger',
        'Bring student ID and trial card',
        'Avoid caffeine two hours before vitals',
      ],
    },
    {
      id: 'visit-2',
      title: 'Remote telehealth follow-up',
      dateLabel: 'Wed, Apr 01',
      timeLabel: '4:00 PM',
      location: 'Secure study video room',
      status: 'scheduled',
      prepSummary:
        'Open the in-app telehealth link five minutes early and make sure notifications are enabled.',
      checklist: [
        'Quiet room',
        'Camera permissions enabled',
        'Recent symptom notes ready',
      ],
    },
    {
      id: 'visit-3',
      title: 'Lab review and drug accountability',
      dateLabel: 'Tue, Apr 07',
      timeLabel: '9:15 AM',
      location: 'UC Clinical Research Center',
      status: 'scheduled',
      prepSummary:
        'Coordinator will reconcile doses, side effects, and wearable data for the previous week.',
      checklist: [
        'Bring medication bottle',
        'Confirm travel route',
        'Upload adverse-event notes',
      ],
    },
  ],
  alerts: [
    {
      id: 'alert-1',
      title: 'Missed check-in risk',
      description:
        'Participant has not submitted this morning\'s symptom report. Auto-reminder sent and coordinator ping ready if no response by 10:30 AM.',
      severity: 'medium',
      patientLabel: 'Maya / Cohort A',
      windowLabel: 'Action window: 40m',
    },
    {
      id: 'alert-2',
      title: 'Dizziness trend cooling down',
      description:
        'Reported dizziness dropped from 3 episodes to 1 episode after dose timing adjustment.',
      severity: 'low',
      patientLabel: 'Maya / Cohort A',
      windowLabel: 'Updated this morning',
    },
    {
      id: 'alert-3',
      title: 'Visit prep nearly complete',
      description:
        'Three of four visit requirements are already cleared. Only the daily check-in remains open.',
      severity: 'low',
      patientLabel: 'Maya / Cohort A',
      windowLabel: 'Before tomorrow 10:30 AM',
    },
  ],
  recentCheckIn: {
    id: 'checkin-previous',
    medicationTaken: true,
    energyLevel: 'Steady',
    stressLevel: 2,
    symptoms: ['fatigue'],
    note: 'Felt a little tired after class but symptoms were manageable.',
    supportRequested: false,
    submittedAt: 'Yesterday at 8:14 PM',
  },
};
