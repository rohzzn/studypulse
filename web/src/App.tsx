import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { AuthScreen } from './components/auth-screen';
import { ClinicianPortal } from './components/clinician-portal';
import { PatientPortal } from './components/patient-portal';
import { Button, Pill } from './components/ui';
import {
  bootstrapProfile,
  createPatientApplication,
  createScreeningRequest,
  createStudy,
  fetchAllApplications,
  fetchAllRequests,
  fetchPatientApplications,
  fetchRequestsForApplications,
  fetchStudies,
  getProfile,
  respondToRequest,
  saveClinicianNotes,
  scheduleCall,
  signIn,
  signOut,
  signUp,
  updateApplicationStatus,
} from './lib/api';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type {
  ApplicationDraft,
  ApplicationStatus,
  AuthSignInInput,
  AuthSignUpInput,
  ClinicianRequestDraft,
  FeedbackTone,
  PatientApplication,
  Profile,
  ScheduleCallDraft,
  ScreeningRequest,
  StudyDraft,
  StudyProgram,
  ThemeMode,
} from './lib/types';

function firstString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function buildFallbackProfile(
  session: Session | null
): Profile | null {
  if (!session?.user.email) {
    return null;
  }

  const metadata = session.user.user_metadata as
    | Record<string, unknown>
    | undefined;
  const role =
    metadata?.role === 'clinician' ? 'clinician' : 'patient';
  const email = session.user.email.trim().toLowerCase();

  return {
    id: session.user.id,
    role,
    email,
    fullName: firstString(
      metadata?.full_name,
      email.split('@')[0] ?? 'StudyPulse user'
    ),
    phone: firstString(metadata?.phone),
    city: firstString(metadata?.city),
    state: firstString(metadata?.state),
    siteName: firstString(
      metadata?.site_name,
      role === 'clinician'
        ? 'StudyPulse Research Network'
        : ''
    ),
    title: firstString(
      metadata?.title,
      role === 'clinician'
        ? 'Clinical Research Coordinator'
        : ''
    ),
  };
}

const THEME_STORAGE_KEY = 'studypulse-web-theme';

function readTheme(): ThemeMode {
  const stored = window.localStorage.getItem(
    THEME_STORAGE_KEY
  );

  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)')
    .matches
    ? 'dark'
    : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studies, setStudies] = useState<StudyProgram[]>([]);
  const [applications, setApplications] = useState<
    PatientApplication[]
  >([]);
  const [requests, setRequests] = useState<ScreeningRequest[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: FeedbackTone;
  } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function refreshPortal(nextSession = session) {
    if (!nextSession) {
      setProfile(null);
      setStudies([]);
      setApplications([]);
      setRequests([]);
      return;
    }

    setPortalLoading(true);

    try {
      const nextProfile =
        (await getProfile(nextSession.user.id)) ??
        (await bootstrapProfile()) ??
        buildFallbackProfile(nextSession);

      if (!nextProfile) {
        setProfile(null);
        setFeedback({
          message:
            'Unable to load your StudyPulse account.',
          tone: 'warning',
        });
        return;
      }

      setProfile(nextProfile);

      const nextStudies = await fetchStudies();
      setStudies(nextStudies);

      if (nextProfile.role === 'patient') {
        const nextApplications = await fetchPatientApplications(
          nextSession,
          nextProfile
        );
        setApplications(nextApplications);
        const nextRequests = await fetchRequestsForApplications(
          nextApplications.map((application) => application.id)
        );
        setRequests(nextRequests);
      } else {
        const [nextApplications, nextRequests] = await Promise.all(
          [fetchAllApplications(), fetchAllRequests()]
        );
        setApplications(nextApplications);
        setRequests(nextRequests);
      }

      setFeedback(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load the StudyPulse portal.';

      setFeedback({
        message,
        tone: 'warning',
      });
    } finally {
      setPortalLoading(false);
    }
  }

  useEffect(() => {
    void refreshPortal(session);
  }, [session]);

  async function withFeedback(
    task: () => Promise<{ message: string; ok: boolean }>
  ) {
    setBusy(true);

    try {
      const result = await task();
      setFeedback({
        message: result.message,
        tone: result.ok ? 'success' : 'warning',
      });

      if (result.ok) {
        await refreshPortal();
      }

      return result;
    } finally {
      setBusy(false);
    }
  }

  const themeLabel = useMemo(
    () => (theme === 'dark' ? 'Light mode' : 'Dark mode'),
    [theme]
  );

  if (authLoading) {
    return <LoadingScreen label="Loading StudyPulse..." />;
  }

  if (!session || !profile) {
    return (
      <main className="app-shell">
        {feedback ? (
          <div className={`toast toast-${feedback.tone}`}>
            {feedback.message}
          </div>
        ) : null}

        <AuthScreen
          busy={busy}
          configured={isSupabaseConfigured}
          onSignIn={async (input: AuthSignInInput) => {
            await withFeedback(() => signIn(input));
          }}
          onSignUp={async (input: AuthSignUpInput) => {
            await withFeedback(() => signUp(input));
          }}
          onToggleTheme={() =>
            setTheme((current) =>
              current === 'dark' ? 'light' : 'dark'
            )
          }
          themeLabel={themeLabel}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark">SP</div>
          <div>
            <p className="eyebrow">StudyPulse</p>
            <h2>
              {profile.role === 'patient'
                ? 'Patient portal'
                : 'Clinician portal'}
            </h2>
          </div>
        </div>

        <div className="site-actions">
          <Pill>{profile.role}</Pill>
          <Button
            variant="ghost"
            onClick={() =>
              setTheme((current) =>
                current === 'dark' ? 'light' : 'dark'
              )
            }
          >
            {themeLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void refreshPortal()}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      {feedback ? (
        <div className={`toast toast-${feedback.tone}`}>
          {feedback.message}
        </div>
      ) : null}

      {portalLoading ? (
        <LoadingScreen label="Refreshing portal..." />
      ) : profile.role === 'patient' ? (
        <PatientPortal
          applications={applications}
          busy={busy}
          onRespond={async (requestId, response) => {
            await withFeedback(() =>
              respondToRequest(requestId, response)
            );
          }}
          onSubmitApplication={async (
            studyId,
            draft: ApplicationDraft
          ) => {
            return withFeedback(() =>
              createPatientApplication(
                session,
                profile,
                studyId,
                draft
              )
            );
          }}
          profile={profile}
          requests={requests}
          studies={studies}
        />
      ) : (
        <ClinicianPortal
          applications={applications}
          busy={busy}
          onCreateRequest={async (
            applicationId,
            draft: ClinicianRequestDraft
          ) => {
            await withFeedback(() =>
              createScreeningRequest(applicationId, draft)
            );
          }}
          onCreateStudy={async (draft: StudyDraft) => {
            await withFeedback(() => createStudy(draft));
          }}
          onSaveNotes={async (applicationId, notes) => {
            await withFeedback(() =>
              saveClinicianNotes(applicationId, notes)
            );
          }}
          onScheduleCall={async (
            applicationId,
            draft: ScheduleCallDraft
          ) => {
            await withFeedback(() =>
              scheduleCall(applicationId, draft)
            );
          }}
          onUpdateStatus={async (
            applicationId,
            status: ApplicationStatus
          ) => {
            await withFeedback(() =>
              updateApplicationStatus(applicationId, status)
            );
          }}
          profile={profile}
          requests={requests}
          studies={studies}
        />
      )}
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-orb" />
      <p>{label}</p>
    </div>
  );
}
