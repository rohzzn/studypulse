import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import {
  createScreeningRequest,
  createStudy,
  loadStudyPulseData,
  readStoredPatientEmail,
  respondToRequest,
  restorePatientSession,
  saveClinicianNotes,
  savePatientApplication,
  scheduleCall,
  updateApplicationStatus,
  writeStoredPatientEmail,
} from '../lib/studyPulseRepository';
import type {
  ActionResult,
  ApplicationStatus,
  ClinicianRequestDraft,
  PatientApplication,
  PatientApplicationDraft,
  ScheduleCallDraft,
  StudyDraft,
  StudyPulseData,
  StudyPulseSource,
} from '../types/studypulse';

export function useStudyPulseData() {
  const [data, setData] = useState<StudyPulseData | null>(null);
  const [source, setSource] =
    useState<StudyPulseSource>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientEmail, setPatientEmailState] = useState<
    string | null
  >(() => readStoredPatientEmail());

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

  useEffect(() => {
    void syncData();
  }, []);

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

  function setPatientEmail(email: string | null) {
    writeStoredPatientEmail(email);
    setPatientEmailState(email);
  }

  const patientApplications =
    data?.applications.filter(
      (application) =>
        patientEmail !== null &&
        application.email.toLowerCase() ===
          patientEmail.toLowerCase()
    ) ?? [];

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
          setPatientEmail(result.patientEmail);
        }

        await syncData(true);
      }

      return result;
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    error,
    loading,
    patientApplications,
    patientEmail,
    patientRequests,
    refresh: () => syncData(true),
    refreshing,
    saving,
    setPatientEmail,
    clearPatientSession: () => setPatientEmail(null),
    source,
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
