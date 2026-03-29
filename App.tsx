import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  Platform,
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
import { AuthScreen } from './src/screens/AuthScreen';
import { ClinicianFlowScreen } from './src/screens/ClinicianFlowScreen';
import { PatientFlowScreen } from './src/screens/PatientFlowScreen';
import { colors } from './src/theme/tokens';
import type {
  FeedbackTone,
  StudyPulseRole,
  StudyPulseSource,
} from './src/types/studypulse';

export default function App() {
  const [demoRole, setDemoRole] =
    useState<StudyPulseRole>('landing');
  const [allowDemoBypass, setAllowDemoBypass] =
    useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: FeedbackTone;
  } | null>(null);

  const {
    authConfigured,
    authLoading,
    clearPatientSession,
    createRequest,
    createStudy,
    data,
    error,
    loading,
    patientApplications,
    patientEmail,
    patientRequests,
    profile,
    refresh,
    refreshing,
    respondToRequest,
    restoreByEmail,
    saveNotes,
    saving,
    scheduleCall,
    session,
    signIn,
    signOut,
    signUp,
    source,
    submitApplication,
    updateStatus,
  } = useStudyPulseData();

  const authActive = authConfigured && !allowDemoBypass;
  const activeRole = profile?.role ?? demoRole;

  async function withFeedback<T extends { ok: boolean; message: string }>(
    task: Promise<T>
  ) {
    const result = await task;
    setFeedback({
      message: result.message,
      tone: result.ok ? 'success' : 'warning',
    });

    if (result.ok && session) {
      setAllowDemoBypass(false);
    }

    return result;
  }

  const shellCopy = useMemo(() => {
    if (authActive && !session) {
      return {
        title: 'StudyPulse',
        subtitle: null,
      };
    }

    if (activeRole === 'patient') {
      return {
        title: 'Patient Flow',
        subtitle:
          'Find a study, apply, respond to requests, and track status.',
      };
    }

    if (activeRole === 'clinician') {
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
  }, [activeRole, authActive, session]);

  const screen = useMemo(() => {
    if ((loading && !data) || (authActive && authLoading)) {
      return (
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>
            Loading StudyPulse
          </Text>
          <Text style={styles.loadingBody}>
            Preparing your account, studies, and application data.
          </Text>
        </View>
      );
    }

    if (authActive && (!session || !profile)) {
      return (
        <AuthScreen
          authConfigured={authConfigured}
          busy={saving}
          onOpenDemo={() => {
            setAllowDemoBypass(true);
            setDemoRole('landing');
            setFeedback({
              message: 'Demo mode enabled on this device.',
              tone: 'success',
            });
          }}
          onSignIn={async (draft) => {
            const result = await withFeedback(signIn(draft));

            if (result.ok) {
              setAllowDemoBypass(false);
            }

            return result;
          }}
          onSignUp={async (draft) => {
            const result = await withFeedback(signUp(draft));

            if (result.ok) {
              setAllowDemoBypass(false);
            }

            return result;
          }}
        />
      );
    }

    if (activeRole === 'patient') {
      return (
        <PatientFlowScreen
          accountMode={authActive ? 'auth' : 'demo'}
          accountProfile={profile}
          accountName={profile?.fullName ?? null}
          applications={patientApplications}
          onClearSession={() => {
            void withFeedback(clearPatientSession());
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

    if (activeRole === 'clinician') {
      return (
        <ClinicianFlowScreen
          applications={data?.applications ?? []}
          clinician={
            profile
              ? {
                  email: profile.email,
                  fullName: profile.fullName,
                  id: profile.id,
                  siteName: profile.siteName,
                  title: profile.title,
                }
              : data?.clinician ?? null
          }
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
        onSelectClinician={() => setDemoRole('clinician')}
        onSelectPatient={() => setDemoRole('patient')}
        source={source}
      />
    );
  }, [
    activeRole,
    authActive,
    authConfigured,
    authLoading,
    createRequest,
    createStudy,
    data,
    loading,
    patientApplications,
    patientEmail,
    patientRequests,
    profile,
    refresh,
    refreshing,
    respondToRequest,
    restoreByEmail,
    saving,
    scheduleCall,
    session,
    clearPatientSession,
    signIn,
    signOut,
    signUp,
    source,
    submitApplication,
    updateStatus,
    saveNotes,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
        style={styles.keyboardShell}
      >
        <View style={styles.root}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.brand}>
                  {shellCopy.title}
                </Text>
                {shellCopy.subtitle ? (
                  <Text style={styles.brandCaption}>
                    {shellCopy.subtitle}
                  </Text>
                ) : null}
              </View>

              <View style={styles.headerActions}>
                {source === 'supabase' ? (
                  <Badge label="Live" tone="success" />
                ) : (
                  <Badge label="Demo" tone="warning" />
                )}
                {authActive && session ? (
                  <Pressable
                    onPress={() => {
                      void withFeedback(signOut());
                    }}
                    style={styles.homeButton}
                  >
                    <Text style={styles.homeButtonText}>
                      Sign out
                    </Text>
                  </Pressable>
                ) : null}
                {!authActive && activeRole !== 'landing' ? (
                  <Pressable
                    onPress={() => setDemoRole('landing')}
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
      </KeyboardAvoidingView>
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
    paddingTop: 10,
    paddingBottom: 18,
    gap: 12,
  },
  keyboardShell: {
    flex: 1,
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
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: colors.line,
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
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
