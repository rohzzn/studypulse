export type TabKey =
  | 'overview'
  | 'checkin'
  | 'signals'
  | 'visits';

export type DataSource = 'demo' | 'supabase';

export type MetricTone =
  | 'blue'
  | 'mint'
  | 'amber'
  | 'rose';

export type FeedbackTone = 'success' | 'warning';

export type TaskStatus = 'done' | 'upcoming' | 'attention';

export type VisitStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed';

export type SymptomKey =
  | 'fatigue'
  | 'headache'
  | 'nausea'
  | 'dizziness'
  | 'sleep';

export type EnergyLevel = 'Low' | 'Steady' | 'High';

export type RiskSeverity = 'low' | 'medium' | 'high';

export type Metric = {
  caption: string;
  id: string;
  label: string;
  tone: MetricTone;
  value: string;
};

export type CareTask = {
  detail: string;
  dueLabel: string;
  id: string;
  status: TaskStatus;
  title: string;
};

export type StudyVisit = {
  checklist: string[];
  dateLabel: string;
  id: string;
  location: string;
  prepSummary: string;
  status: VisitStatus;
  timeLabel: string;
  title: string;
};

export type RiskSignal = {
  description: string;
  id: string;
  patientLabel: string;
  severity: RiskSeverity;
  title: string;
  windowLabel: string;
};

export type DailyCheckInDraft = {
  energyLevel: EnergyLevel | null;
  medicationTaken: boolean | null;
  note: string;
  stressLevel: number;
  supportRequested: boolean;
  symptoms: SymptomKey[];
};

export type DailyCheckIn = {
  energyLevel: EnergyLevel;
  id: string;
  medicationTaken: boolean;
  note: string;
  stressLevel: number;
  submittedAt: string;
  supportRequested: boolean;
  symptoms: SymptomKey[];
};

export type TrialData = {
  alerts: RiskSignal[];
  metrics: Metric[];
  participant: {
    cohort: string;
    coordinatorName: string;
    coordinatorNote: string;
    firstName: string;
    id: string;
    nextDoseLabel: string;
    nextVisitLabel: string;
    studyName: string;
  };
  recentCheckIn: DailyCheckIn | null;
  sponsorFit: string;
  tasks: CareTask[];
  todaysFocus: string;
  trendSummary: {
    adherencePercent: number;
    checkInsCompleted: number;
    checkInsTarget: number;
    responseTimeLabel: string;
    signalLabel: string;
  };
  visits: StudyVisit[];
};
