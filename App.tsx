import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InlineBanner } from './src/components/ui';
import {
  AppCard,
  Badge,
  PrimaryButton,
} from './src/components/studyPulseUi';
import { useStudyPulseData } from './src/hooks/useStudyPulseData';
import { ClinicianFlowScreen } from './src/screens/ClinicianFlowScreen';
import { PatientFlowScreen } from './src/screens/PatientFlowScreen';
import { colors } from './src/theme/tokens';
import type {
  FeedbackTone,
  StudyPulseRole,
  StudyPulseSource,
} from './src/types/studypulse';

export default function App() {
  const [role, setRole] =
    useState<StudyPulseRole>('landing');
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: FeedbackTone;
  } | null>(null);

  const {
    clearPatientSession,
    createRequest,
    createStudy,
    data,
    error,
    loading,
    patientApplications,
    patientEmail,
    patientRequests,
    refresh,
    refreshing,
    respondToRequest,
    restoreByEmail,
    saveNotes,
    saving,
    source,
    submitApplication,
    updateStatus,
    scheduleCall,
  } = useStudyPulseData();

  async function withFeedback<T extends { ok: boolean; message: string }>(
    task: Promise<T>
  ) {
    const result = await task;
    setFeedback({
      message: result.message,
      tone: result.ok ? 'success' : 'warning',
    });
    return result;
  }

  const shellCopy = useMemo(() => {
    if (role === 'patient') {
      return {
        title: 'Patient Flow',
        subtitle:
          'Find a study, apply, respond to requests, and track status.',
      };
    }

    if (role === 'clinician') {
      return {
        title: 'Clinician Flow',
        subtitle:
          'Create a study, review applicants, request information, and schedule calls.',
      };
    }

    return {
      title: 'StudyPulse',
      subtitle:
        'Clinical trial recruitment with one patient flow and one clinician flow.',
    };
  }, [role]);

  const screen = useMemo(() => {
    if (loading && !data) {
      return (
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>
            Loading StudyPulse
          </Text>
          <Text style={styles.loadingBody}>
            Pulling studies, applications, and clinic requests.
          </Text>
        </View>
      );
    }

    if (role === 'patient') {
      return (
        <PatientFlowScreen
          applications={patientApplications}
          onClearSession={() => {
            clearPatientSession();
            setFeedback({
              message: 'Saved patient session removed.',
              tone: 'success',
            });
          }}
          onRespondToRequest={(requestId, response) =>
            withFeedback(
              respondToRequest(requestId, response)
            )
          }
          onRestoreByEmail={(email) =>
            withFeedback(restoreByEmail(email))
          }
          onSubmitApplication={(draft, studyId, existing) =>
            withFeedback(
              submitApplication(draft, studyId, existing)
            )
          }
          patientEmail={patientEmail}
          requests={patientRequests}
          saving={saving}
          studies={data?.studies ?? []}
        />
      );
    }

    if (role === 'clinician') {
      return (
        <ClinicianFlowScreen
          applications={data?.applications ?? []}
          clinician={data?.clinician ?? null}
          createRequest={(applicationId, draft) =>
            withFeedback(
              createRequest(applicationId, draft)
            )
          }
          createStudy={(draft) =>
            withFeedback(createStudy(draft))
          }
          onRefresh={refresh}
          refreshing={refreshing}
          requests={data?.requests ?? []}
          saveNotes={(applicationId, notes) =>
            withFeedback(saveNotes(applicationId, notes))
          }
          saving={saving}
          scheduleCall={(applicationId, draft) =>
            withFeedback(
              scheduleCall(applicationId, draft)
            )
          }
          studies={data?.studies ?? []}
          updateStatus={(applicationId, status) =>
            withFeedback(
              updateStatus(applicationId, status)
            )
          }
        />
      );
    }

    return (
      <ModeSelectScreen
        onSelectClinician={() => setRole('clinician')}
        onSelectPatient={() => setRole('patient')}
        source={source}
      />
    );
  }, [
    clearPatientSession,
    createRequest,
    createStudy,
    data,
    loading,
    patientApplications,
    patientEmail,
    patientRequests,
    refresh,
    refreshing,
    respondToRequest,
    restoreByEmail,
    role,
    saveNotes,
    saving,
    scheduleCall,
    source,
    submitApplication,
    updateStatus,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle="dark-content"
      />
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.brand}>
                {shellCopy.title}
              </Text>
              <Text style={styles.brandCaption}>
                {shellCopy.subtitle}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {source === 'supabase' ? (
                <Badge label="Live" tone="success" />
              ) : (
                <Badge label="Demo" tone="warning" />
              )}
              {role !== 'landing' ? (
                <Pressable
                  onPress={() => setRole('landing')}
                  style={styles.homeButton}
                >
                  <Text style={styles.homeButtonText}>
                    Home
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {feedback ? (
          <InlineBanner
            message={feedback.message}
            tone={feedback.tone}
          />
        ) : null}

        {error ? (
          <InlineBanner message={error} tone="warning" />
        ) : null}

        <View style={styles.screen}>{screen}</View>
      </View>
    </SafeAreaView>
  );
}

function ModeSelectScreen({
  onSelectClinician,
  onSelectPatient,
  source,
}: {
  onSelectClinician: () => void;
  onSelectPatient: () => void;
  source: StudyPulseSource;
}) {
  return (
    <View style={styles.modeRoot}>
      <AppCard style={styles.modeCard}>
        <Text style={styles.modeTitle}>Patient</Text>
        <Text style={styles.modeBody}>
          Browse open studies, apply, answer clinic
          follow-ups, and track your application status.
        </Text>
        <PrimaryButton
          label="Open patient flow"
          onPress={onSelectPatient}
        />
      </AppCard>

      <AppCard style={styles.modeCard}>
        <Text style={styles.modeTitle}>Clinician</Text>
        <Text style={styles.modeBody}>
          Publish studies, review applicants, request
          more information, and schedule screening calls.
        </Text>
        <PrimaryButton
          label="Open clinician flow"
          onPress={onSelectClinician}
        />
      </AppCard>

      {source === 'demo' ? (
        <AppCard style={styles.modeHint}>
          <Text style={styles.modeHintText}>
            Supabase is not active right now, so the app is
            showing local demo data.
          </Text>
        </AppCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
  },
  brandCaption: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
    maxWidth: 520,
  },
  homeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E9F2F8',
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  screen: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  loadingBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  modeRoot: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  modeCard: {
    gap: 12,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  modeBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  modeHint: {
    gap: 10,
  },
  modeHintText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
  },
});
