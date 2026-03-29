import { mockTrialData } from '../data/mockData';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  CareTask,
  DailyCheckIn,
  DailyCheckInDraft,
  DataSource,
  RiskSignal,
  StudyVisit,
  TaskStatus,
  TrialData,
  VisitStatus,
} from '../types/trial';

const LOCAL_CHECK_IN_KEY = 'study-pulse:latest-check-in';

type ParticipantRow = {
  cohort: string | null;
  coordinator_name: string | null;
  coordinator_note: string | null;
  first_name: string;
  id: string;
  next_dose_label: string | null;
  study_name: string;
};

type VisitRow = {
  checklist: string[] | null;
  location: string;
  prep_summary: string | null;
  scheduled_for: string;
  status: VisitStatus;
  title: string;
};

type TaskRow = {
  detail: string;
  due_label: string;
  status: TaskStatus;
  title: string;
};

type AlertRow = {
  description: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  window_label: string;
};

type CheckInRow = {
  created_at: string;
  energy_level: DailyCheckIn['energyLevel'];
  id: string;
  medication_taken: boolean;
  notes: string | null;
  stress_level: number;
  support_requested: boolean;
  symptoms: DailyCheckIn['symptoms'] | null;
};

type LoadResult = {
  data: TrialData;
  error?: string;
  source: DataSource;
};

type SubmitResult = {
  data: TrialData;
  error?: string;
  source: DataSource;
};

function readLocalCheckIn(): DailyCheckIn | null {
  try {
    const raw = globalThis.localStorage.getItem(
      LOCAL_CHECK_IN_KEY
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DailyCheckIn;
  } catch {
    return null;
  }
}

function persistLocalCheckIn(checkIn: DailyCheckIn) {
  globalThis.localStorage.setItem(
    LOCAL_CHECK_IN_KEY,
    JSON.stringify(checkIn)
  );
}

function formatDateLabel(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

function formatTimeLabel(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function relativeCheckInLabel() {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

function buildLocalSignal(
  base: TrialData,
  checkIn: DailyCheckIn
): RiskSignal {
  const needsFastFollowUp =
    checkIn.supportRequested ||
    checkIn.stressLevel >= 4 ||
    checkIn.symptoms.includes('dizziness');

  if (needsFastFollowUp) {
    return {
      id: `signal-${checkIn.id}`,
      title: 'Escalation requested',
      description:
        'Participant asked for support in the latest check-in. Coordinator review should happen before the next medication window.',
      severity: 'high',
      patientLabel: `${base.participant.firstName} / ${base.participant.cohort}`,
      windowLabel: 'Action window: now',
    };
  }

  if (checkIn.symptoms.length >= 2) {
    return {
      id: `signal-${checkIn.id}`,
      title: 'Symptom bundle detected',
      description:
        'Multiple symptoms were reported together. The participant remains stable, but the site can review patterns before the next visit.',
      severity: 'medium',
      patientLabel: `${base.participant.firstName} / ${base.participant.cohort}`,
      windowLabel: 'Review before visit',
    };
  }

  return {
    id: `signal-${checkIn.id}`,
    title: 'Daily check-in completed',
    description:
      'Medication was confirmed and no urgent symptoms were flagged in the latest report.',
    severity: 'low',
    patientLabel: `${base.participant.firstName} / ${base.participant.cohort}`,
    windowLabel: 'Just synced',
  };
}

function updateMetricsWithCheckIn(
  base: TrialData,
  checkIn: DailyCheckIn
): TrialData {
  const adherencePercent = checkIn.medicationTaken ? 97 : 84;
  const riskLabel =
    checkIn.supportRequested || checkIn.stressLevel >= 4
      ? 'Watch'
      : checkIn.symptoms.length >= 2
        ? 'Monitor'
        : 'Stable';

  return {
    ...base,
    trendSummary: {
      ...base.trendSummary,
      adherencePercent,
      signalLabel: riskLabel,
    },
    metrics: base.metrics.map(
      (metric): TrialData['metrics'][number] => {
      if (metric.id === 'adherence') {
        return {
          ...metric,
          value: `${adherencePercent}%`,
          caption: 'Updated after latest check-in',
          tone: checkIn.medicationTaken ? 'mint' : 'amber',
        };
      }

      if (metric.id === 'risk-status') {
        return {
          ...metric,
          value: riskLabel,
          caption:
            riskLabel === 'Stable'
              ? 'No urgent sponsor signals'
              : 'Coordinator follow-up recommended',
          tone:
            riskLabel === 'Stable'
              ? 'amber'
              : riskLabel === 'Monitor'
                ? 'blue'
                : 'rose',
        };
      }

      return metric;
      }
    ),
  };
}

export function mergeCheckInIntoTrialData(
  base: TrialData,
  checkIn: DailyCheckIn
): TrialData {
  const updatedTasks: CareTask[] = base.tasks.map((task) => {
    if (task.id !== 'task-checkin') {
      return task;
    }

    return {
      ...task,
      status: 'done',
      dueLabel: 'Completed',
      detail: 'Latest participant report is on file.',
    };
  });

  const nextSignal = buildLocalSignal(base, checkIn);
  const nextAlerts = [
    nextSignal,
    ...base.alerts.filter((alert) => alert.id !== nextSignal.id),
  ].slice(0, 4);

  return {
    ...updateMetricsWithCheckIn(base, checkIn),
    tasks: updatedTasks,
    alerts: nextAlerts,
    recentCheckIn: checkIn,
  };
}

function hydrateDemoData(): TrialData {
  const localCheckIn = readLocalCheckIn();

  if (!localCheckIn) {
    return mockTrialData;
  }

  return mergeCheckInIntoTrialData(mockTrialData, localCheckIn);
}

function mapVisitRow(row: VisitRow): StudyVisit {
  return {
    id: `${row.title}-${row.scheduled_for}`,
    title: row.title,
    dateLabel: formatDateLabel(row.scheduled_for),
    timeLabel: formatTimeLabel(row.scheduled_for),
    location: row.location,
    status: row.status,
    prepSummary: row.prep_summary ?? 'Study prep details will appear here.',
    checklist: row.checklist ?? [],
  };
}

function mapTaskRow(row: TaskRow, index: number): CareTask {
  const stableId =
    row.title.toLowerCase().includes('check-in')
      ? 'task-checkin'
      : `task-${index}`;

  return {
    id: stableId,
    title: row.title,
    detail: row.detail,
    status: row.status,
    dueLabel: row.due_label,
  };
}

function mapAlertRow(
  row: AlertRow,
  participantLabel: string,
  index: number
): RiskSignal {
  return {
    id: `alert-${index}`,
    title: row.title,
    description: row.description,
    severity: row.severity,
    patientLabel: participantLabel,
    windowLabel: row.window_label,
  };
}

function mapCheckInRow(row: CheckInRow | null): DailyCheckIn | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    medicationTaken: row.medication_taken,
    energyLevel: row.energy_level,
    stressLevel: row.stress_level,
    symptoms: row.symptoms ?? [],
    note: row.notes ?? '',
    supportRequested: row.support_requested,
    submittedAt: `${formatDateLabel(row.created_at)} at ${formatTimeLabel(
      row.created_at
    )}`,
  };
}

function mapSupabaseRowsToTrialData(
  participant: ParticipantRow,
  visits: VisitRow[],
  tasks: TaskRow[],
  alerts: AlertRow[],
  latestCheckIn: CheckInRow | null
): TrialData {
  const participantLabel = `${participant.first_name} / ${participant.cohort ?? 'Study cohort'}`;
  const recentCheckIn = mapCheckInRow(latestCheckIn);
  const highAlerts = alerts.filter(
    (alert) => alert.severity === 'high'
  ).length;
  const mediumAlerts = alerts.filter(
    (alert) => alert.severity === 'medium'
  ).length;
  const adherencePercent = recentCheckIn?.medicationTaken ? 97 : 90;

  const base: TrialData = {
    participant: {
      id: participant.id,
      firstName: participant.first_name,
      studyName: participant.study_name,
      cohort: participant.cohort ?? 'Study cohort',
      coordinatorName:
        participant.coordinator_name ?? 'Site coordinator',
      coordinatorNote:
        participant.coordinator_note ??
        'Coordinator note unavailable.',
      nextVisitLabel:
        visits[0] !== undefined
          ? `${formatDateLabel(visits[0].scheduled_for)} at ${formatTimeLabel(
              visits[0].scheduled_for
            )}`
          : 'Next visit not scheduled',
      nextDoseLabel:
        participant.next_dose_label ?? 'Dose window not configured',
    },
    todaysFocus:
      'Reduce friction for the participant, keep the coordinator informed, and keep study operations moving with fewer missed steps.',
    sponsorFit:
      'The app supports better retention, faster safety visibility, and a more reliable digital study workflow for coordinators and sponsors.',
    trendSummary: {
      adherencePercent,
      checkInsCompleted: recentCheckIn ? 7 : 6,
      checkInsTarget: 7,
      signalLabel:
        highAlerts > 0
          ? 'Watch'
          : mediumAlerts > 0
            ? 'Monitor'
            : 'Stable',
      responseTimeLabel: highAlerts > 0 ? '< 1h' : '< 2h',
    },
    metrics: [
      {
        id: 'adherence',
        label: 'Medication adherence',
        value: `${adherencePercent}%`,
        caption: 'Rolling check-in confidence',
        tone: 'mint',
      },
      {
        id: 'visit-readiness',
        label: 'Visit readiness',
        value: `${Math.min(4, tasks.length)}/4`,
        caption: 'Prep steps tracked in-app',
        tone: 'blue',
      },
      {
        id: 'risk-status',
        label: 'Risk status',
        value:
          highAlerts > 0
            ? 'Watch'
            : mediumAlerts > 0
              ? 'Monitor'
              : 'Stable',
        caption:
          highAlerts > 0
            ? 'Urgent coordinator action needed'
            : 'No urgent adverse-event signal',
        tone: highAlerts > 0 ? 'rose' : 'amber',
      },
      {
        id: 'response-time',
        label: 'Coordinator response',
        value: highAlerts > 0 ? '<1h' : '<2h',
        caption: 'Follow-up window for escalations',
        tone: 'rose',
      },
    ],
    tasks: tasks.map(mapTaskRow),
    visits: visits.map(mapVisitRow),
    alerts: alerts.map((alert, index) =>
      mapAlertRow(alert, participantLabel, index)
    ),
    recentCheckIn,
  };

  return recentCheckIn
    ? mergeCheckInIntoTrialData(base, recentCheckIn)
    : base;
}

export async function loadTrialData(): Promise<LoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: hydrateDemoData(),
      error:
        'Supabase env vars are missing, so the app is running in demo mode.',
      source: 'demo',
    };
  }

  try {
    const [
      participantResult,
      visitsResult,
      tasksResult,
      alertsResult,
      latestCheckInResult,
    ] = await Promise.all([
      supabase
        .from('participants')
        .select(
          'id, first_name, study_name, cohort, coordinator_name, coordinator_note, next_dose_label'
        )
        .limit(1)
        .maybeSingle(),
      supabase
        .from('study_visits')
        .select(
          'title, scheduled_for, location, status, prep_summary, checklist'
        )
        .order('scheduled_for', { ascending: true })
        .limit(4),
      supabase
        .from('care_tasks')
        .select('title, detail, status, due_label')
        .order('sort_order', { ascending: true })
        .limit(6),
      supabase
        .from('alerts')
        .select('title, description, severity, window_label')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('daily_check_ins')
        .select(
          'id, created_at, medication_taken, energy_level, stress_level, symptoms, notes, support_requested'
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError =
      participantResult.error ??
      visitsResult.error ??
      tasksResult.error ??
      alertsResult.error ??
      latestCheckInResult.error;

    if (firstError || !participantResult.data) {
      throw new Error(
        firstError?.message ??
          'No participant rows were returned from Supabase.'
      );
    }

    return {
      data: mapSupabaseRowsToTrialData(
        participantResult.data as ParticipantRow,
        (visitsResult.data ?? []) as VisitRow[],
        (tasksResult.data ?? []) as TaskRow[],
        (alertsResult.data ?? []) as AlertRow[],
        (latestCheckInResult.data ?? null) as CheckInRow | null
      ),
      source: 'supabase',
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Supabase fetch failed.';

    return {
      data: hydrateDemoData(),
      error: `${message} Falling back to demo data.`,
      source: 'demo',
    };
  }
}

export async function submitDailyCheckIn(
  draft: DailyCheckInDraft,
  currentData?: TrialData
): Promise<SubmitResult> {
  const baseData = currentData ?? hydrateDemoData();
  const participantId = baseData.participant.id;

  const nextCheckIn: DailyCheckIn = {
    id: `local-${Date.now()}`,
    medicationTaken: draft.medicationTaken ?? false,
    energyLevel: draft.energyLevel ?? 'Steady',
    stressLevel: draft.stressLevel,
    symptoms: draft.symptoms,
    note: draft.note.trim(),
    supportRequested: draft.supportRequested,
    submittedAt: `Today at ${relativeCheckInLabel()}`,
  };

  persistLocalCheckIn(nextCheckIn);

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: mergeCheckInIntoTrialData(baseData, nextCheckIn),
      error:
        'Supabase env vars are missing, so the latest check-in was saved locally only.',
      source: 'demo',
    };
  }

  const { data, error } = await supabase
    .from('daily_check_ins')
    .insert({
      participant_id: participantId,
      medication_taken: nextCheckIn.medicationTaken,
      energy_level: nextCheckIn.energyLevel,
      stress_level: nextCheckIn.stressLevel,
      symptoms: nextCheckIn.symptoms,
      notes: nextCheckIn.note,
      support_requested: nextCheckIn.supportRequested,
    })
    .select(
      'id, created_at, medication_taken, energy_level, stress_level, symptoms, notes, support_requested'
    )
    .single();

  if (error) {
    return {
      data: mergeCheckInIntoTrialData(baseData, nextCheckIn),
      error: `${error.message} Saved locally instead.`,
      source: 'demo',
    };
  }

  const savedCheckIn = mapCheckInRow(data as CheckInRow | null);

  return {
    data: mergeCheckInIntoTrialData(
      baseData,
      savedCheckIn ?? nextCheckIn
    ),
    source: 'supabase',
  };
}
