import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  createScreeningRequest,
  createStudy,
  fetchStudyPulseProfile,
  loadStudyPulseData,
  readStoredPatientEmail,
  respondToRequest,
  restorePatientSession,
  saveClinicianNotes,
  savePatientApplication,
  scheduleCall,
  signInStudyPulseAccount,
  signOutStudyPulseAccount,
  signUpStudyPulseAccount,
  updateApplicationStatus,
  writeStoredPatientEmail,
} from '../lib/studyPulseRepository';
import type {
  ActionResult,
  ApplicationStatus,
  AuthSignInDraft,
  AuthSignUpDraft,
  ClinicianRequestDraft,
  PatientApplication,
  PatientApplicationDraft,
  ScheduleCallDraft,
  StudyDraft,
  StudyPulseData,
  StudyPulseProfile,
  StudyPulseSource,
} from '../types/studypulse';

export function useStudyPulseData() {
  const [data, setData] = useState<StudyPulseData | null>(null);
  const [source, setSource] =
    useState<StudyPulseSource>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(
    isSupabaseConfigured
  );
  const [error, setError] = useState<string | null>(null);
  const [storedPatientEmail, setStoredPatientEmailState] =
    useState<string | null>(() => readStoredPatientEmail());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] =
    useState<StudyPulseProfile | null>(null);

  async function syncData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await loadStudyPulseData();
      setData(result.data);
      setSource(result.source);
      setError(result.error ?? null);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load StudyPulse data.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function setStoredPatientEmail(email: string | null) {
    writeStoredPatientEmail(email);
    setStoredPatientEmailState(email);
  }

  useEffect(() => {
    void syncData();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

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
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      return;
    }

    let active = true;
    setAuthLoading(true);

    void fetchStudyPulseProfile(session.user.id)
      .then((nextProfile) => {
        if (!active) {
          return;
        }

        setProfile(nextProfile);

        if (nextProfile?.email) {
          setStoredPatientEmail(nextProfile.email);
        }
      })
      .catch((profileError) => {
        if (!active) {
          return;
        }

        setProfile(null);
        setError(
          profileError instanceof Error
            ? profileError.message
            : 'Unable to load account profile.'
        );
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const channel = client
      .channel('studypulse-flow')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_programs',
        },
        () => {
          void syncData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_applications',
        },
        () => {
          void syncData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screening_requests',
        },
        () => {
          void syncData(true);
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const patientIdentity = useMemo(() => {
    if (session?.user.id && profile?.email) {
      return {
        authUserId: session.user.id,
        email: profile.email.toLowerCase(),
      };
    }

    if (storedPatientEmail) {
      return {
        authUserId: null,
        email: storedPatientEmail.toLowerCase(),
      };
    }

    return null;
  }, [profile?.email, session?.user.id, storedPatientEmail]);

  const patientApplications =
    data?.applications.filter((application) => {
      if (!patientIdentity) {
        return false;
      }

      if (
        patientIdentity.authUserId &&
        application.authUserId === patientIdentity.authUserId
      ) {
        return true;
      }

      return (
        application.email.toLowerCase() ===
        patientIdentity.email
      );
    }) ?? [];

  const patientRequests =
    data?.requests.filter((request) =>
      patientApplications.some(
        (application) => application.id === request.applicationId
      )
    ) ?? [];

  async function runAction(
    task: () => Promise<ActionResult>
  ): Promise<ActionResult> {
    setSaving(true);

    try {
      const result = await task();

      if (result.ok) {
        if (result.patientEmail !== undefined) {
          setStoredPatientEmail(result.patientEmail);
        }

        await syncData(true);
      }

      return result;
    } finally {
      setSaving(false);
    }
  }

  return {
    authConfigured: isSupabaseConfigured,
    authLoading,
    data,
    error,
    loading,
    patientApplications,
    patientEmail: profile?.email ?? storedPatientEmail,
    patientRequests,
    profile,
    refresh: () => syncData(true),
    refreshing,
    saving,
    session,
    source,
    clearPatientSession: () =>
      isSupabaseConfigured && supabase
        ? runAction(() => signOutStudyPulseAccount())
        : Promise.resolve({
            ok: true,
            message: 'Session cleared.',
          }).then((result) => {
            setStoredPatientEmail(null);
            return result;
          }),
    signIn: (draft: AuthSignInDraft) =>
      runAction(() => signInStudyPulseAccount(draft)),
    signOut: () =>
      runAction(() => signOutStudyPulseAccount()),
    signUp: (draft: AuthSignUpDraft) =>
      runAction(() => signUpStudyPulseAccount(draft)),
    submitApplication: (
      draft: PatientApplicationDraft,
      studyId: string,
      existing?: PatientApplication
    ) =>
      runAction(() =>
        savePatientApplication(draft, studyId, existing)
      ),
    restoreByEmail: (email: string) =>
      runAction(() => restorePatientSession(email)),
    respondToRequest: (
      requestId: string,
      response: string
    ) => runAction(() => respondToRequest(requestId, response)),
    createStudy: (draft: StudyDraft) =>
      runAction(() => createStudy(draft)),
    updateStatus: (
      applicationId: string,
      status: ApplicationStatus
    ) =>
      runAction(() =>
        updateApplicationStatus(applicationId, status)
      ),
    saveNotes: (applicationId: string, notes: string) =>
      runAction(() => saveClinicianNotes(applicationId, notes)),
    createRequest: (
      applicationId: string,
      draft: ClinicianRequestDraft
    ) =>
      runAction(() =>
        createScreeningRequest(applicationId, draft)
      ),
    scheduleCall: (
      applicationId: string,
      draft: ScheduleCallDraft
    ) =>
      runAction(() => scheduleCall(applicationId, draft)),
  };
}
